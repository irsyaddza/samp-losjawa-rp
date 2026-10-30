import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { listMailbox } from '@/lib/mailbox';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import {
  countMailboxText,
  extractMailboxText,
  hasMailboxContent,
  MAX_BODY_JSON_LENGTH,
  MAX_BODY_TEXT_LENGTH,
  parseMailboxBody,
} from '@/lib/tiptap-content';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const MAX_SUBJECT_LENGTH = 120;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const data = await listMailbox(session.userId, {
      box: searchParams.get('box') || 'inbox',
      page: Number(searchParams.get('page')) || 1,
      query: searchParams.get('q') || '',
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error loading mailbox:', error);
    return NextResponse.json({ error: 'Failed to load mailbox.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const toUsername = typeof payload.toUsername === 'string' ? payload.toUsername.trim() : '';
    const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
    const rawBody = typeof payload.body === 'string' ? payload.body.trim() : '';

    if (!toUsername || !subject || !rawBody) {
      return NextResponse.json({ error: 'Recipient, subject, and message are required.' }, { status: 400 });
    }

    if (toUsername.length > 24) {
      return NextResponse.json({ error: 'Invalid recipient.' }, { status: 400 });
    }

    if (subject.length > MAX_SUBJECT_LENGTH) {
      return NextResponse.json(
        { error: `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    if (rawBody.length > MAX_BODY_JSON_LENGTH || Buffer.byteLength(rawBody, 'utf8') > 60_000) {
      return NextResponse.json({ error: 'Message is too large.' }, { status: 400 });
    }

    const doc = parseMailboxBody(rawBody);
    if (!doc || !hasMailboxContent(doc)) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    if (countMailboxText(doc) > MAX_BODY_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Message must be ${MAX_BODY_TEXT_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    const bodyText = extractMailboxText(doc);
    const body = JSON.stringify(doc);

    if (toUsername.toLowerCase() === session.username.toLowerCase()) {
      return NextResponse.json({ error: 'You cannot send a message to yourself.' }, { status: 400 });
    }

    const limit = await checkRateLimit({
      action: 'mailbox:send',
      key: String(session.userId),
      limit: 30,
      windowSeconds: 60 * 60,
    });

    if (!limit.allowed) {
      return rateLimitResponse(limit);
    }

    const [targetRows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, Username FROM accounts WHERE Username = ? LIMIT 1',
      [toUsername]
    );

    if (targetRows.length === 0) {
      return NextResponse.json({ error: 'Recipient UCP account not found.' }, { status: 404 });
    }

    const recipient = targetRows[0];
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO ucp_messages
           (sender_id, sender_username, recipient_id, recipient_username, subject, body, body_text)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [session.userId, session.username, recipient.ID, recipient.Username, subject, body, bodyText]
      );

      const messageId = result.insertId;

      await connection.execute(
        `INSERT INTO ucp_message_states (message_id, account_id, mailbox, is_read)
         VALUES (?, ?, 'sent', 1), (?, ?, 'inbox', 0)`,
        [messageId, session.userId, messageId, recipient.ID]
      );

      await connection.commit();

      return NextResponse.json({ success: true, id: messageId }, { status: 201 });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }
}

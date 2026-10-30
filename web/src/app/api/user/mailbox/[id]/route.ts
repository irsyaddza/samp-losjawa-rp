import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

async function readId(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return null;

  const messageId = Number(id);
  return Number.isSafeInteger(messageId) && messageId > 0 ? messageId : null;
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const messageId = await readId(params);
  if (!messageId) {
    return NextResponse.json({ error: 'Invalid message.' }, { status: 400 });
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE ucp_message_states
       SET is_read = 1
       WHERE message_id = ? AND account_id = ? AND mailbox = 'inbox'`,
      [messageId, session.userId]
    );

    if (result.affectedRows === 0) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT 1
         FROM ucp_message_states
         WHERE message_id = ? AND account_id = ? AND mailbox = 'inbox'
         LIMIT 1`,
        [messageId, session.userId]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    return NextResponse.json({ error: 'Failed to update message.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const messageId = await readId(params);
  if (!messageId) {
    return NextResponse.json({ error: 'Invalid message.' }, { status: 400 });
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM ucp_message_states WHERE message_id = ? AND account_id = ?',
      [messageId, session.userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    }

    await pool.execute(
      `DELETE m
       FROM ucp_messages m
       LEFT JOIN ucp_message_states s ON s.message_id = m.id
       WHERE m.id = ? AND s.message_id IS NULL`,
      [messageId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Failed to delete message.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { TICKET_CATEGORIES } from '@/lib/tickets';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { category, subject, body } = await request.json();

    if (typeof category !== 'string' || typeof subject !== 'string' || typeof body !== 'string') {
      return NextResponse.json({ error: 'Invalid ticket data.' }, { status: 400 });
    }

    if (!TICKET_CATEGORIES.some((item) => item.value === category)) {
      return NextResponse.json({ error: 'Please choose a valid category.' }, { status: 400 });
    }

    const cleanSubject = subject.trim();
    const cleanBody = body.trim();

    if (cleanSubject.length < 5 || cleanSubject.length > 120) {
      return NextResponse.json({ error: 'Subject must be between 5 and 120 characters.' }, { status: 400 });
    }

    if (cleanBody.length < 10 || cleanBody.length > 5000) {
      return NextResponse.json({ error: 'Message must be between 10 and 5000 characters.' }, { status: 400 });
    }

    const [openRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ucp_tickets
       WHERE account_id = ? AND status IN ('open', 'in_progress')`,
      [session.userId]
    );

    if (Number(openRows[0]?.total || 0) >= 5) {
      return NextResponse.json(
        { error: 'You already have 5 active tickets. Please wait for a staff reply.' },
        { status: 429 }
      );
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [ticketResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO ucp_tickets (account_id, username, category, subject)
         VALUES (?, ?, ?, ?)`,
        [session.userId, session.username, category, cleanSubject]
      );

      await connection.execute(
        `INSERT INTO ucp_ticket_messages (ticket_id, author_id, author_username, is_staff, body)
         VALUES (?, ?, ?, 0, ?)`,
        [ticketResult.insertId, session.userId, session.username, cleanBody]
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        ticketId: ticketResult.insertId,
        message: 'Ticket created successfully.',
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json({ error: 'Failed to create ticket.' }, { status: 500 });
  }
}

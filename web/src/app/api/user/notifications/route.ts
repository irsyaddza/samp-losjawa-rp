import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toUsername, title, body } = await req.json();

    if (!toUsername || !title || !body) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (toUsername.toLowerCase() === session.username.toLowerCase()) {
      return NextResponse.json({ error: 'Anda tidak dapat mengirim pesan ke diri sendiri' }, { status: 400 });
    }

    // Check if target user exists
    const [targetRows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID FROM accounts WHERE Username = ? LIMIT 1',
      [toUsername]
    );

    if (targetRows.length === 0) {
      return NextResponse.json({ error: 'Nama Akun UCP tujuan tidak ditemukan' }, { status: 404 });
    }

    const targetUserId = targetRows[0].ID;

    // Insert into notifications
    await pool.execute(
      'INSERT INTO notifications (master, title, body, sender, `read`) VALUES (?, ?, ?, ?, 0)',
      [targetUserId, title, body, session.username]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending notification/message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing notification ID' }, { status: 400 });
    }

    // Update notifications table
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE notifications SET `read` = 1 WHERE ID = ? AND master = ?',
      [id, session.userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Notification not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing notification ID' }, { status: 400 });
    }

    // Delete notifications table row
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM notifications WHERE ID = ? AND master = ?',
      [id, session.userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Notification not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

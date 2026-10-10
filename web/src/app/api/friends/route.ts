import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get active friends (friendPending = 0)
    const [activeRows] = await pool.execute<RowDataPacket[]>(
      `SELECT f.ID as requestId,
              IF(f.playerID = ?, f.friendID, f.playerID) as friendId,
              IF(f.playerID = ?, f.friendName, f.playerName) as friendUsername
       FROM ucp_friends f
       WHERE (f.playerID = ? OR f.friendID = ?) AND f.friendPending = 0`,
      [session.userId, session.userId, session.userId, session.userId]
    );

    // Enrich active friends with online status and character count
    const activeFriends = await Promise.all(
      activeRows.map(async (row) => {
        const [charRows] = await pool.execute<RowDataPacket[]>(
          `SELECT ID, char_name, Level, Online FROM characters WHERE master = ?`,
          [row.friendId]
        );
        const isOnline = charRows.some((c) => c.Online > 0);
        return {
          requestId: row.requestId,
          friendId: row.friendId,
          friendUsername: row.friendUsername,
          isOnline,
          characters: charRows.map((c) => ({
            id: c.ID,
            name: c.char_name.replace('_', ' '),
            level: c.Level,
            online: c.Online > 0,
          })),
        };
      })
    );

    // 2. Get incoming pending requests (where I am friendID and friendPending = 1)
    const [incomingRows] = await pool.execute<RowDataPacket[]>(
      `SELECT ID as requestId, playerID as senderId, playerName as senderUsername
       FROM ucp_friends
       WHERE friendID = ? AND friendPending = 1`,
      [session.userId]
    );

    // 3. Get outgoing sent requests (where I am playerID and friendPending = 1)
    const [outgoingRows] = await pool.execute<RowDataPacket[]>(
      `SELECT ID as requestId, friendID as targetId, friendName as targetUsername
       FROM ucp_friends
       WHERE playerID = ? AND friendPending = 1`,
      [session.userId]
    );

    return NextResponse.json({
      active: activeFriends,
      incoming: incomingRows,
      outgoing: outgoingRows,
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json({ error: 'Failed to fetch friends data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, targetUsername, requestId } = await req.json();

    if (action === 'add') {
      if (!targetUsername || typeof targetUsername !== 'string') {
        return NextResponse.json({ error: 'Please specify a valid UCP username.' }, { status: 400 });
      }

      const cleanUsername = targetUsername.trim();

      if (cleanUsername.toLowerCase() === session.username.toLowerCase()) {
        return NextResponse.json({ error: 'You cannot add yourself as a friend.' }, { status: 400 });
      }

      // Check if target account exists
      const [targetAccount] = await pool.execute<RowDataPacket[]>(
        'SELECT ID, Username FROM accounts WHERE Username = ? LIMIT 1',
        [cleanUsername]
      );

      if (targetAccount.length === 0) {
        return NextResponse.json({ error: `Account "${cleanUsername}" was not found.` }, { status: 404 });
      }

      const targetId = targetAccount[0].ID;
      const actualTargetUsername = targetAccount[0].Username;

      // Check if relationship already exists
      const [existing] = await pool.execute<RowDataPacket[]>(
        `SELECT ID, friendPending FROM ucp_friends 
         WHERE (playerID = ? AND friendID = ?) OR (playerID = ? AND friendID = ?)`,
        [session.userId, targetId, targetId, session.userId]
      );

      if (existing.length > 0) {
        if (existing[0].friendPending === 0) {
          return NextResponse.json({ error: `${actualTargetUsername} is already in your friends list.` }, { status: 400 });
        } else {
          return NextResponse.json({ error: `A pending friend request already exists with ${actualTargetUsername}.` }, { status: 400 });
        }
      }

      // Insert new friend request
      await pool.execute<ResultSetHeader>(
        `INSERT INTO ucp_friends (playerID, playerName, friendID, friendName, friendPending)
         VALUES (?, ?, ?, ?, 1)`,
        [session.userId, session.username, targetId, actualTargetUsername]
      );

      return NextResponse.json({ success: true, message: `Friend request sent to ${actualTargetUsername}.` });
    }

    if (action === 'accept') {
      if (!requestId) {
        return NextResponse.json({ error: 'Invalid request ID.' }, { status: 400 });
      }

      const [updated] = await pool.execute<ResultSetHeader>(
        `UPDATE ucp_friends SET friendPending = 0 WHERE ID = ? AND friendID = ? AND friendPending = 1`,
        [requestId, session.userId]
      );

      if (updated.affectedRows === 0) {
        return NextResponse.json({ error: 'Friend request not found or already processed.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Friend request accepted!' });
    }

    if (action === 'remove' || action === 'cancel' || action === 'decline') {
      if (!requestId) {
        return NextResponse.json({ error: 'Invalid request ID.' }, { status: 400 });
      }

      const [deleted] = await pool.execute<ResultSetHeader>(
        `DELETE FROM ucp_friends WHERE ID = ? AND (playerID = ? OR friendID = ?)`,
        [requestId, session.userId, session.userId]
      );

      if (deleted.affectedRows === 0) {
        return NextResponse.json({ error: 'Friend record not found.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Friend record removed.' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error handling friend action:', error);
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
  }
}

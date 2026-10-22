import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import Navbar from '@/components/Navbar';
import InboxClient from './InboxClient';

async function getNotifications(userId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, title, body, DATE_FORMAT(time, "%Y-%m-%dT%H:%i:%s.000Z") as time, `read`, sender FROM notifications WHERE master = ? ORDER BY time DESC',
      [userId]
    );
    return rows.map(row => ({
      id: row.ID,
      title: row.title,
      body: row.body,
      time: row.time,
      read: row.read === 1,
      sender: row.sender
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

async function getSentMessages(username: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT n.ID, n.title, n.body, DATE_FORMAT(n.time, "%Y-%m-%dT%H:%i:%s.000Z") as time,
              COALESCE(a.Username, 'Unknown') as recipient
       FROM notifications n
       LEFT JOIN accounts a ON a.ID = n.master
       WHERE n.sender = ?
       ORDER BY n.time DESC`,
      [username]
    );
    return rows.map(row => ({
      id: row.ID,
      title: row.title,
      body: row.body,
      time: row.time,
      read: true,
      sender: username,
      recipient: row.recipient
    }));
  } catch (error) {
    console.error('Error fetching sent messages:', error);
    return [];
  }
}

async function getUserEmail(username: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT Email FROM accounts WHERE Username = ? LIMIT 1',
      [username]
    );
    return rows[0]?.Email || '';
  } catch {
    return '';
  }
}

export default async function InboxPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const email = await getUserEmail(session.username);
  const notifications = await getNotifications(session.userId);
  const sentMessages = await getSentMessages(session.username);

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-12">
      <Navbar session={session ? { username: session.username, email } : null} />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-4xl">
        <InboxClient
          initialNotifications={notifications}
          initialSentMessages={sentMessages}
          currentUsername={session.username}
        />
      </main>
    </div>
  );
}

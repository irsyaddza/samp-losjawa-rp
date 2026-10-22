import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import FriendsClient from './FriendsClient';

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

export default async function FriendsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const email = await getUserEmail(session.username);

  return (
    <FriendsClient
      navSession={{
        username: session.username,
        email,
        adminLevel: session.adminLevel,
      }}
    />
  );
}

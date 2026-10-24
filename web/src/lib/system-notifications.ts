import pool from '@/lib/db';

interface CreateSystemNotificationInput {
  accountId: number;
  type?: string;
  title: string;
  body?: string | null;
  link?: string | null;
}

export interface SystemNotificationRecord {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: number;
  created_at: string;
}

export async function createSystemNotification({
  accountId,
  type = 'system',
  title,
  body,
  link,
}: CreateSystemNotificationInput) {
  try {
    await pool.execute(
      'INSERT INTO ucp_notifications (account_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)',
      [
        accountId,
        type.slice(0, 32),
        title.slice(0, 120),
        body ? body.slice(0, 500) : null,
        link?.startsWith('/') ? link.slice(0, 255) : null,
      ]
    );
  } catch (error) {
    console.error('Failed to create system notification:', error);
  }
}

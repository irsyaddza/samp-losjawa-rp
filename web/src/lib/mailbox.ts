import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export type MailboxBox = 'inbox' | 'sent';

export interface MailboxMessage {
  id: number;
  subject: string;
  body: string;
  bodyText: string;
  sender: string;
  recipient: string;
  createdAt: string;
  isRead: boolean;
}

export interface MailboxPage {
  messages: MailboxMessage[];
  total: number;
  page: number;
  pageSize: number;
  unread: number;
}

const PAGE_SIZE = 20;

export async function getUnreadMessageCount(accountId: number): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS count
     FROM ucp_message_states
     WHERE account_id = ? AND mailbox = 'inbox' AND is_read = 0`,
    [accountId]
  );

  return Number(rows[0]?.count || 0);
}

export async function listMailbox(
  accountId: number,
  options: { box?: string; page?: number; query?: string }
): Promise<MailboxPage> {
  const box: MailboxBox = options.box === 'sent' ? 'sent' : 'inbox';
  const requestedPage = Math.floor(Number(options.page));
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10_000) : 1;
  const query = (options.query || '').trim().slice(0, 80);
  const offset = (page - 1) * PAGE_SIZE;

  const filters = ['s.account_id = ?', 's.mailbox = ?'];
  const params: Array<string | number> = [accountId, box];

  if (query) {
    const pattern = `%${query}%`;
    filters.push(
      '(m.subject LIKE ? OR m.body_text LIKE ? OR m.sender_username LIKE ? OR m.recipient_username LIKE ?)'
    );
    params.push(pattern, pattern, pattern, pattern);
  }

  const where = filters.join(' AND ');

  const [[countRows], [rows], unread] = await Promise.all([
    pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM ucp_message_states s
       JOIN ucp_messages m ON m.id = s.message_id
       WHERE ${where}`,
      params
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT m.id, m.subject, m.body, m.body_text, m.sender_username, m.recipient_username,
              m.created_at, s.is_read
       FROM ucp_message_states s
       JOIN ucp_messages m ON m.id = s.message_id
       WHERE ${where}
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset]
    ),
    getUnreadMessageCount(accountId),
  ]);

  return {
    messages: rows.map((row) => ({
      id: Number(row.id),
      subject: row.subject,
      body: row.body,
      bodyText: row.body_text || '',
      sender: row.sender_username,
      recipient: row.recipient_username,
      createdAt: new Date(row.created_at).toISOString(),
      isRead: Number(row.is_read) === 1,
    })),
    total: Number(countRows[0]?.total || 0),
    page,
    pageSize: PAGE_SIZE,
    unread,
  };
}

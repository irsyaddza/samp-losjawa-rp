import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

const HEAD_ADMIN = 1337;

async function requireHeadAdmin() {
  const session = await getSession();
  if (!session || session.adminLevel !== HEAD_ADMIN) return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireHeadAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, version, entry, added_by, added_date, created_at
       FROM server_changelogs ORDER BY id DESC LIMIT 50`
    );
    return NextResponse.json({ success: true, entries: rows });
  } catch (error) {
    console.error('Changelog admin fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireHeadAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const version = String(body.version || '').trim();
    const lines: string[] = Array.isArray(body.lines)
      ? body.lines.map((l: string) => String(l).trim()).filter(Boolean)
      : [];

    if (!version) {
      return NextResponse.json({ error: 'Version is required.' }, { status: 400 });
    }
    if (lines.length === 0) {
      return NextResponse.json({ error: 'At least one entry line is required.' }, { status: 400 });
    }

    let inserted = 0;
    for (const entry of lines) {
      if (entry.length > 256) continue;
      await pool.execute(
        `INSERT INTO server_changelogs (entry, added_by, version, added_date)
         VALUES (?, ?, ?, DATE_FORMAT(NOW(), '%d/%m/%Y'))`,
        [entry, session.username, version]
      );
      inserted++;
    }

    return NextResponse.json({ success: true, inserted });
  } catch (error) {
    console.error('Changelog insert error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireHeadAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = parseInt(body.id, 10);
    if (!id) {
      return NextResponse.json({ error: 'Entry id is required.' }, { status: 400 });
    }

    await pool.execute('DELETE FROM server_changelogs WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Changelog delete error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAdminAction } from '@/lib/audit';
import { RowDataPacket } from 'mysql2';

const HEAD_ADMIN = 1337;

// shortcut: the admin list loads up to 200 entries in one request; add
// server-side pagination when the changelog outgrows it.
const ADMIN_LIST_LIMIT = 200;

async function requireHeadAdmin() {
  const session = await getSession();
  if (!session || session.adminLevel !== HEAD_ADMIN) return null;
  return session;
}

export async function GET() {
  const session = await requireHeadAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, version, component, entry, added_by, added_date, created_at
       FROM server_changelogs ORDER BY id DESC LIMIT ${ADMIN_LIST_LIMIT}`
    );
    const [versionRows] = await pool.execute<RowDataPacket[]>(
      `SELECT version, component FROM server_changelogs
       GROUP BY version, component ORDER BY MAX(created_at) DESC`
    );

    return NextResponse.json({
      success: true,
      entries: rows,
      versions: versionRows.map((row) => ({
        version: row.version,
        component: row.component,
      })),
    });
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
    const component = String(body.component || 'game').toLowerCase();
    const lines: string[] = Array.isArray(body.lines)
      ? body.lines.map((l: string) => String(l).trim()).filter(Boolean)
      : [];

    if (!version) {
      return NextResponse.json({ error: 'Version is required.' }, { status: 400 });
    }
    if (component !== 'game' && component !== 'web') {
      return NextResponse.json({ error: 'Component must be game or web.' }, { status: 400 });
    }

    const prefix = component === 'game' ? 'LJ:RP ' : 'UCP ';
    if (!version.startsWith(prefix)) {
      return NextResponse.json(
        { error: `Version must start with "${prefix}" for the ${component === 'game' ? 'game' : 'portal'} changelog.` },
        { status: 400 }
      );
    }

    if (lines.length === 0) {
      return NextResponse.json({ error: 'At least one entry line is required.' }, { status: 400 });
    }

    let inserted = 0;
    for (const entry of lines) {
      if (entry.length > 256) continue;
      await pool.execute(
        `INSERT INTO server_changelogs (entry, added_by, version, component, added_date)
         VALUES (?, ?, ?, ?, DATE_FORMAT(NOW(), '%d/%m/%Y'))`,
        [entry, session.username, version, component]
      );
      inserted++;
    }

    await logAdminAction({
      adminId: session.userId,
      adminUsername: session.username,
      action: 'changelog.create',
      targetType: 'changelog',
      details: `Published ${inserted} ${component} changelog ${inserted === 1 ? 'entry' : 'entries'} for version ${version}.`,
      request: req,
    });

    return NextResponse.json({ success: true, inserted });
  } catch (error) {
    console.error('Changelog insert error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireHeadAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = parseInt(body.id, 10);
    const component = String(body.component || '').toLowerCase();

    if (!id) {
      return NextResponse.json({ error: 'Entry id is required.' }, { status: 400 });
    }
    if (component !== 'game' && component !== 'web') {
      return NextResponse.json({ error: 'Component must be game or web.' }, { status: 400 });
    }

    await pool.execute('UPDATE server_changelogs SET component = ? WHERE id = ?', [component, id]);

    await logAdminAction({
      adminId: session.userId,
      adminUsername: session.username,
      action: 'changelog.reclassify',
      targetType: 'changelog',
      targetId: id,
      details: `Moved changelog entry #${id} to the ${component} changelog.`,
      request: req,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Changelog reclassify error:', error);
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

    await logAdminAction({
      adminId: session.userId,
      adminUsername: session.username,
      action: 'changelog.delete',
      targetType: 'changelog',
      targetId: id,
      details: `Deleted changelog entry #${id}.`,
      request: req,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Changelog delete error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

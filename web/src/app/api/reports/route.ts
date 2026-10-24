import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { REPORT_CATEGORIES } from '@/lib/reports';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const category = typeof body?.category === 'string' ? body.category : '';
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const evidence = typeof body?.evidence === 'string' ? body.evidence.trim() : '';
    const reportedName = typeof body?.reportedName === 'string' ? body.reportedName.trim() : '';
    const characterId = body?.characterId ? Number(body.characterId) : null;

    if (!REPORT_CATEGORIES.some((item) => item.value === category)) {
      return NextResponse.json({ error: 'Please choose a valid report category.' }, { status: 400 });
    }

    if (reportedName.length < 3 || reportedName.length > 64) {
      return NextResponse.json(
        { error: 'Enter the reported character name or UCP username.' },
        { status: 400 }
      );
    }

    if (subject.length < 5 || subject.length > 120) {
      return NextResponse.json({ error: 'Subject must be between 5 and 120 characters.' }, { status: 400 });
    }

    if (description.length < 20 || description.length > 5000) {
      return NextResponse.json({ error: 'Chronology must be between 20 and 5000 characters.' }, { status: 400 });
    }

    if (evidence.length > 2000) {
      return NextResponse.json({ error: 'Evidence must be 2000 characters or fewer.' }, { status: 400 });
    }

    let reporterCharacterId: number | null = null;
    let reporterCharacterName: string | null = null;

    if (characterId !== null) {
      if (!Number.isInteger(characterId) || characterId <= 0) {
        return NextResponse.json({ error: 'Please choose a valid character.' }, { status: 400 });
      }

      const [characterRows] = await pool.execute<RowDataPacket[]>(
        'SELECT ID, char_name FROM characters WHERE ID = ? AND master = ? LIMIT 1',
        [characterId, session.userId]
      );

      if (characterRows.length === 0) {
        return NextResponse.json({ error: 'Please choose one of your characters.' }, { status: 400 });
      }

      reporterCharacterId = Number(characterRows[0].ID);
      reporterCharacterName = String(characterRows[0].char_name);
    }

    const [openRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ucp_player_reports
       WHERE reporter_account_id = ? AND status IN ('open', 'investigating')`,
      [session.userId]
    );

    if (Number(openRows[0]?.total || 0) >= 5) {
      return NextResponse.json(
        { error: 'You already have 5 active reports. Please wait for staff to review them.' },
        { status: 429 }
      );
    }

    let reportedAccountId: number | null = null;
    let reportedUsername: string | null = null;
    let reportedCharacterId: number | null = null;
    let reportedCharacterName = reportedName;

    const characterName = reportedName.replace(/\s+/g, '_');
    const [reportedCharacters] = await pool.execute<RowDataPacket[]>(
      `SELECT c.ID, c.char_name, c.master, a.Username
       FROM characters c
       JOIN accounts a ON a.ID = c.master
       WHERE c.char_name = ?
       LIMIT 1`,
      [characterName]
    );

    if (reportedCharacters.length > 0) {
      const target = reportedCharacters[0];
      reportedAccountId = Number(target.master);
      reportedUsername = target.Username ? String(target.Username) : null;
      reportedCharacterId = Number(target.ID);
      reportedCharacterName = String(target.char_name);
    } else {
      const [reportedAccounts] = await pool.execute<RowDataPacket[]>(
        'SELECT ID, Username FROM accounts WHERE Username = ? LIMIT 1',
        [reportedName]
      );

      if (reportedAccounts.length > 0) {
        reportedAccountId = Number(reportedAccounts[0].ID);
        reportedUsername = String(reportedAccounts[0].Username);
      }
    }

    if (reportedAccountId === session.userId) {
      return NextResponse.json({ error: 'You cannot report your own account.' }, { status: 400 });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO ucp_player_reports
         (reporter_account_id, reporter_username, reporter_character_id, reporter_character_name,
          reported_account_id, reported_username, reported_character_id, reported_character_name,
          category, subject, description, evidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.userId,
        session.username,
        reporterCharacterId,
        reporterCharacterName,
        reportedAccountId,
        reportedUsername,
        reportedCharacterId,
        reportedCharacterName,
        category,
        subject,
        description,
        evidence || null,
      ]
    );

    return NextResponse.json({
      success: true,
      reportId: result.insertId,
      message: 'Your report has been submitted. Staff will review it and notify you.',
    });
  } catch (error) {
    console.error('Submit player report error:', error);
    return NextResponse.json({ error: 'Failed to submit your report.' }, { status: 500 });
  }
}

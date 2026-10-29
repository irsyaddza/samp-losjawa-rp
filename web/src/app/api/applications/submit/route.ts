import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getClientIp } from '@/lib/rate-limit';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { charName, story, origin, gender, age, answer1, answer2 } = await request.json();

    if (!charName || !story || !origin || !gender || !age || !answer1 || !answer2) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Validate character name format (must be Firstname_Lastname, e.g. Ganjar_Prabroro)
    const nameRegex = /^[A-Z][a-z]+_[A-Z][a-z]+$/;
    if (!nameRegex.test(charName)) {
      return NextResponse.json({
        error: 'Character name must be in format: Firstname_Lastname (e.g. Ganjar_Prabroro)'
      }, { status: 400 });
    }

    // Validate story length
    if (story.length < 200) {
      return NextResponse.json({ error: 'Character backstory must be at least 200 characters long' }, { status: 400 });
    }

    // Check if character name is already taken in characters
    const [existingChars] = await pool.execute<RowDataPacket[]>(
      'SELECT ID FROM characters WHERE char_name = ? LIMIT 1',
      [charName]
    );

    if (existingChars.length > 0) {
      return NextResponse.json({ error: 'Character name is already taken' }, { status: 400 });
    }

    // Check if character name has a pending application
    const [existingApps] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM application WHERE char_name = ? AND status = 0 LIMIT 1',
      [charName]
    );

    if (existingApps.length > 0) {
      return NextResponse.json({ error: 'This character name already has a pending application' }, { status: 400 });
    }

    // Save answers in the accounts table (legacy support)
    await pool.execute(
      'UPDATE accounts SET answer1 = ?, answer2 = ?, answered_questions = answered_questions + 1 WHERE ID = ?',
      [answer1, answer2, session.userId]
    );

    // Save default skin based on gender
    const defaultSkin = gender.toLowerCase() === 'male' ? 264 : 298;

    // Save ip details
    const clientIp = getClientIp(request);
    const userIp = (clientIp === 'unknown' ? '127.0.0.1' : clientIp).slice(0, 60);

    // Insert into application table
    await pool.execute(
      'INSERT INTO application (master, char_name, story, ip_address, country_name, country_code, status, accepted, reason, date_of_review, date_of_verdict, origin, gender, age, skin) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?)',
      [
        session.userId,
        charName,
        story,
        userIp,
        'Indonesia', // Default country name
        'ID',        // Default country code
        '',          // reason initially empty
        '',          // date_of_review initially empty
        '',          // date_of_verdict initially empty
        origin,
        gender,
        parseInt(age, 10),
        defaultSkin
      ]
    );

    return NextResponse.json({ success: true, message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Submit application error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

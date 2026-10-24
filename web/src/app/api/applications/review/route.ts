import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { createSystemNotification } from '@/lib/system-notifications';
import { logAdminAction } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.adminLevel <= 0) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { appId, action, reason } = await request.json();

    if (!appId || !action) {
      return NextResponse.json({ error: 'App ID and action are required' }, { status: 400 });
    }

    // Get application details
    const [appRows] = await pool.execute<RowDataPacket[]>(
      'SELECT master, char_name, story, origin, gender, age, skin FROM application WHERE id = ? LIMIT 1',
      [appId]
    );

    if (appRows.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const app = appRows[0];
    const currentDate = new Date().toLocaleDateString('en-US');

    if (action === 'accept') {
      // 1. Update application status
      await pool.execute(
        'UPDATE application SET status = 1, accepted = 1, reviewed_by = ?, reason = ?, date_of_review = ? WHERE id = ?',
        [session.userId, 'Accepted', currentDate, appId]
      );

      // 2. Generate a random phone number for the character
      const minPhone = 100000;
      const maxPhone = 999999;
      const phoneNum = Math.floor(Math.random() * (maxPhone - minPhone + 1)) + minPhone;

      // 3. Create the character in characters table
      const [characterResult] = await pool.execute<ResultSetHeader>(
        'INSERT INTO characters (master, char_name, Model, Activated, Cash, BankAccount, Level, PhoneNumbr, playerJob) VALUES (?, ?, ?, 1, 10000, 5000, 1, ?, 0)',
        [app.master, app.char_name, app.skin, phoneNum]
      );

      await createSystemNotification({
        accountId: Number(app.master),
        type: 'application',
        title: 'Character application accepted',
        body: `${app.char_name} has been approved and is ready to play.`,
        link: `/dashboard/character/${characterResult.insertId}`,
      });

      await logAdminAction({
        adminId: session.userId,
        adminUsername: session.username,
        action: 'application.accept',
        targetType: 'application',
        targetId: appId,
        details: `Accepted application for ${app.char_name}.`,
        request,
      });

      return NextResponse.json({ success: true, message: 'Application accepted and character created!' });
    } else if (action === 'deny') {
      if (!reason) {
        return NextResponse.json({ error: 'Reason for denial is required' }, { status: 400 });
      }

      // Update application status
      await pool.execute(
        'UPDATE application SET status = 1, accepted = 0, reviewed_by = ?, reason = ?, date_of_review = ? WHERE id = ?',
        [session.userId, reason, currentDate, appId]
      );

      await createSystemNotification({
        accountId: Number(app.master),
        type: 'application',
        title: 'Character application rejected',
        body: `${app.char_name}: ${String(reason).slice(0, 300)}`,
        link: '/dashboard',
      });

      await logAdminAction({
        adminId: session.userId,
        adminUsername: session.username,
        action: 'application.deny',
        targetType: 'application',
        targetId: appId,
        details: `Rejected application for ${app.char_name}. Reason: ${reason}`,
        request,
      });

      return NextResponse.json({ success: true, message: 'Application denied successfully.' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Review application error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

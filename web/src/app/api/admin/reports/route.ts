import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { logAdminAction } from '@/lib/audit';
import { createSystemNotification } from '@/lib/system-notifications';
import { REPORT_STATUSES } from '@/lib/reports';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.adminLevel <= 0) {
    return NextResponse.json({ error: 'Forbidden. Staff access required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const reportId = Number(body?.reportId);
    const action = body?.action;

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return NextResponse.json({ error: 'Please choose a valid report.' }, { status: 400 });
    }

    if (action !== 'assign' && action !== 'unassign' && action !== 'update') {
      return NextResponse.json({ error: 'Invalid report action.' }, { status: 400 });
    }

    const [reportRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, reporter_account_id, reporter_username, subject, status,
              assigned_username, reported_username, reported_character_name
       FROM ucp_player_reports
       WHERE id = ?
       LIMIT 1`,
      [reportId]
    );

    if (reportRows.length === 0) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    }

    const report = reportRows[0];

    if (action === 'assign') {
      await pool.execute(
        `UPDATE ucp_player_reports
         SET assigned_to = ?, assigned_username = ?
         WHERE id = ?`,
        [session.userId, session.username, reportId]
      );

      await logAdminAction({
        adminId: session.userId,
        adminUsername: session.username,
        action: 'report.assign',
        targetType: 'player_report',
        targetId: reportId,
        details: `Assigned report #${reportId} "${report.subject}" to themselves.`,
        request,
      });

      return NextResponse.json({ success: true, message: 'Report assigned to you.' });
    }

    if (action === 'unassign') {
      await pool.execute(
        'UPDATE ucp_player_reports SET assigned_to = NULL, assigned_username = NULL WHERE id = ?',
        [reportId]
      );

      await logAdminAction({
        adminId: session.userId,
        adminUsername: session.username,
        action: 'report.unassign',
        targetType: 'player_report',
        targetId: reportId,
        details: `Unassigned report #${reportId} "${report.subject}".`,
        request,
      });

      return NextResponse.json({ success: true, message: 'Report unassigned.' });
    }

    const status = typeof body?.status === 'string' ? body.status : '';
    const staffNotes = typeof body?.staffNotes === 'string' ? body.staffNotes.trim() : '';
    const resolution = typeof body?.resolution === 'string' ? body.resolution.trim() : '';

    if (!REPORT_STATUSES.some((item) => item.value === status)) {
      return NextResponse.json({ error: 'Choose a valid report status.' }, { status: 400 });
    }

    if (staffNotes.length > 4000) {
      return NextResponse.json({ error: 'Internal notes must be 4000 characters or fewer.' }, { status: 400 });
    }

    if (resolution.length > 2000) {
      return NextResponse.json({ error: 'Player response must be 2000 characters or fewer.' }, { status: 400 });
    }

    const finalStatus = status === 'resolved' || status === 'rejected';

    if (finalStatus && resolution.length < 5) {
      return NextResponse.json(
        { error: 'Write a short explanation for the player before closing the report.' },
        { status: 400 }
      );
    }

    await pool.execute(
      `UPDATE ucp_player_reports
       SET status = ?, staff_notes = ?, resolution = ?, admin_username = ?, reviewed_at = ${finalStatus ? 'NOW()' : 'NULL'}
       WHERE id = ?`,
      [status, staffNotes || null, finalStatus ? resolution : null, session.username, reportId]
    );

    const statusChanged = status !== report.status;

    if (finalStatus && statusChanged) {
      await createSystemNotification({
        accountId: Number(report.reporter_account_id),
        type: 'moderation',
        title: `Report #${reportId} ${status}`,
        body: resolution,
        link: `/dashboard/reports#report-${reportId}`,
      });
    }

    await logAdminAction({
      adminId: session.userId,
      adminUsername: session.username,
      action: statusChanged ? 'report.status' : 'report.update',
      targetType: 'player_report',
      targetId: reportId,
      details: `${statusChanged ? `Changed report status from ${report.status} to ${status}` : 'Updated report notes'} for #${reportId} "${report.subject}" by ${report.reporter_username}.${
        finalStatus ? ` Player response: ${resolution}` : ''
      }`,
      request,
    });

    return NextResponse.json({
      success: true,
      message: statusChanged ? `Report marked as ${status}.` : 'Report updated.',
    });
  } catch (error) {
    console.error('Admin player report error:', error);
    return NextResponse.json({ error: 'Failed to update the report.' }, { status: 500 });
  }
}

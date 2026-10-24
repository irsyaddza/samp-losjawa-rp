import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logAdminAction } from '@/lib/audit';

export async function GET() {
  const session = await getSession();
  if (!session || (session.adminLevel !== 1336 && session.adminLevel !== 1337)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, ucp_name, property_type, property_id, mapping_code, created_at, custom_title FROM property_mappings WHERE status = 0 ORDER BY created_at ASC'
    );

    return NextResponse.json({ requests: rows });
  } catch (error) {
    console.error('Error fetching admin pending mappings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.adminLevel !== 1336 && session.adminLevel !== 1337)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, action, note } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'Data form tidak lengkap.' }, { status: 400 });
    }

    const reqId = parseInt(id);
    let statusNum = 0;

    if (action === 'approve') {
      statusNum = 1; // APPROVED
    } else if (action === 'reject') {
      statusNum = 2; // REJECTED
    } else {
      return NextResponse.json({ error: 'Aksi tidak dikenal.' }, { status: 400 });
    }

    const adminComment = note || '';

    // Update status in database
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE property_mappings SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [statusNum, adminComment, reqId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Request mapping tidak ditemukan.' }, { status: 404 });
    }

    await logAdminAction({
      adminId: session.userId,
      adminUsername: session.username,
      action: `mapping.${action}`,
      targetType: 'property_mapping',
      targetId: reqId,
      details: `Mapping request #${reqId} ${action === 'approve' ? 'approved' : 'rejected'}${adminComment ? `: ${adminComment}` : '.'}`,
      request: req,
    });

    return NextResponse.json({ success: true, message: `Request mapping berhasil di-${action}.` });
  } catch (error) {
    console.error('Error processing mapping review:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

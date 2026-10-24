import pool from '@/lib/db';

interface LogAdminActionInput {
  adminId: number;
  adminUsername: string;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  details?: string | null;
  request?: Request;
}

function getClientIp(request?: Request) {
  if (!request) return null;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;

  return request.headers.get('x-real-ip') || null;
}

export async function logAdminAction({
  adminId,
  adminUsername,
  action,
  targetType,
  targetId,
  details,
  request,
}: LogAdminActionInput) {
  try {
    await pool.execute(
      `INSERT INTO ucp_admin_audit
         (admin_id, admin_username, action, target_type, target_id, details, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        adminUsername.slice(0, 32),
        action.slice(0, 64),
        targetType ? targetType.slice(0, 32) : null,
        targetId === null || targetId === undefined ? null : String(targetId).slice(0, 64),
        details ? details.slice(0, 4000) : null,
        getClientIp(request),
      ]
    );
  } catch (error) {
    // Auditing must never block the actual admin action.
    console.error('Failed to write admin audit log:', error);
  }
}

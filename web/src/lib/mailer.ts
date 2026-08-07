import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export function resolveBaseUrl(requestOrBaseUrl?: Request | string): string {
  if (typeof requestOrBaseUrl === 'string' && requestOrBaseUrl.trim() !== '') {
    return requestOrBaseUrl.replace(/\/$/, '');
  }

  if (requestOrBaseUrl && typeof requestOrBaseUrl === 'object' && 'headers' in requestOrBaseUrl) {
    const req = requestOrBaseUrl as Request;
    const origin = req.headers.get('origin');
    if (origin && !origin.includes('0.0.0.0')) {
      return origin.replace(/\/$/, '');
    }
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    if (host && !host.startsWith('0.0.0.0')) {
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envUrl && envUrl !== 'http://localhost:3000' && envUrl.trim() !== '') {
    return envUrl.replace(/\/$/, '');
  }

  return 'https://losjawa-rp.fun';
}

export async function sendVerificationEmail(email: string, token: string, requestOrBaseUrl?: Request | string) {
  const baseUrl = resolveBaseUrl(requestOrBaseUrl);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@losjawa-rp.fun';
  const link = `${baseUrl}/verify-email?token=${token}`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: from,
    to: email,
    subject: 'Verify your Los Jawa RP account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0b;color:#e4e4e7;padding:32px;border-radius:16px;">
        <h1 style="color:#f59e0b;font-size:20px;margin-bottom:8px;">Los Jawa RP — Email Verification</h1>
        <p style="font-size:13px;color:#a1a1aa;">Click the button below to verify your email address and activate your UCP account.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#f59e0b;color:#0a0a0b;font-weight:800;border-radius:12px;text-decoration:none;font-size:13px;">
          VERIFY EMAIL
        </a>
        <p style="font-size:11px;color:#52525b;">This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
        <p style="font-size:11px;color:#3f3f46;margin-top:16px;">Or copy this URL: ${link}</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string, requestOrBaseUrl?: Request | string) {
  const baseUrl = resolveBaseUrl(requestOrBaseUrl);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@losjawa-rp.fun';
  const link = `${baseUrl}/reset-password?token=${token}`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: from,
    to: email,
    subject: 'Reset your Los Jawa RP password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0b;color:#e4e4e7;padding:32px;border-radius:16px;">
        <h1 style="color:#f59e0b;font-size:20px;margin-bottom:8px;">Los Jawa RP — Password Reset</h1>
        <p style="font-size:13px;color:#a1a1aa;">We received a request to reset your password. Click the button below to set a new password.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#f59e0b;color:#0a0a0b;font-weight:800;border-radius:12px;text-decoration:none;font-size:13px;">
          RESET PASSWORD
        </a>
        <p style="font-size:11px;color:#52525b;">This link expires in 1 hour. If you did not request a password reset, ignore this email.</p>
        <p style="font-size:11px;color:#3f3f46;margin-top:16px;">Or copy this URL: ${link}</p>
      </div>
    `,
  });
}

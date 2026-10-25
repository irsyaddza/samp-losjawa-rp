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
    // Nodemailer validates SMTP TLS certificates by default. Do not disable this.
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

interface EnterpriseEmailOptions {
  baseUrl: string;
  preheader: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonUrl: string;
  expiryNote: string;
}

function buildEnterpriseEmailHtml({
  baseUrl,
  preheader,
  title,
  subtitle,
  buttonText,
  buttonUrl,
  expiryNote,
}: EnterpriseEmailOptions): string {
  const logoUrl = `${baseUrl}/logo.png`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#18181b;">
  <!-- Preheader text for inbox preview -->
  <div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:20px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);overflow:hidden;">
          
          <!-- Header Banner with Logo -->
          <tr>
            <td style="padding:32px 32px 24px 32px;border-bottom:1px solid #f4f4f5;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <img src="${logoUrl}" alt="Los Jawa RP Logo" width="42" height="42" style="display:block;height:42px;width:auto;border:0;" />
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="font-size:12px;font-weight:800;letter-spacing:0.15em;color:#09090b;text-transform:uppercase;">
                      LOS JAWA <span style="color:#d97706;">RP</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Email Content -->
          <tr>
            <td style="padding:36px 32px;">
              <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#09090b;line-height:1.3;">
                ${title}
              </h1>
              
              <p style="margin:0 0 28px 0;font-size:14px;line-height:1.6;color:#52525b;">
                ${subtitle}
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 32px 0;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:#f59e0b;">
                    <a href="${buttonUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;letter-spacing:0.02em;color:#09090b;text-decoration:none;border-radius:12px;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice Box -->
              <div style="background-color:#fffbeb;border:1px solid #fef08a;border-radius:12px;padding:16px;margin-bottom:24px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#92400e;font-weight:500;">
                  ⚠️ <strong>Security Note:</strong> ${expiryNote}
                </p>
              </div>

              <!-- Fallback Direct URL -->
              <p style="margin:0;font-size:11px;line-height:1.5;color:#a1a1aa;word-break:break-all;">
                If the button above does not work, copy and paste this link into your browser:<br />
                <a href="${buttonUrl}" style="color:#d97706;text-decoration:underline;">${buttonUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:24px 32px;border-top:1px solid #f4f4f5;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;color:#71717a;">
                Los Jawa Roleplay — Official UCP Automated System
              </p>
              <p style="margin:0 0 16px 0;font-size:11px;color:#a1a1aa;">
                <a href="${baseUrl}" style="color:#71717a;text-decoration:none;">Website</a> &nbsp;•&nbsp;
                <a href="https://forum.losjawa-rp.net" style="color:#71717a;text-decoration:none;">Forum</a> &nbsp;•&nbsp;
                <a href="${baseUrl}/donator" style="color:#71717a;text-decoration:none;">Donator Portal</a>
              </p>
              <p style="margin:0;font-size:10px;color:#d4d4d8;line-height:1.4;">
                This is an automated system email. Please do not reply directly to this address.<br />
                &copy; ${new Date().getFullYear()} Los Jawa Roleplay Community. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendVerificationEmail(email: string, token: string, requestOrBaseUrl?: Request | string) {
  const baseUrl = resolveBaseUrl(requestOrBaseUrl);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@losjawa-rp.fun';
  const link = `${baseUrl}/verify-email?token=${token}`;

  const html = buildEnterpriseEmailHtml({
    baseUrl,
    preheader: 'Verify your email address to activate your UCP account on Los Jawa Roleplay.',
    title: 'Verify Your Email Address',
    subtitle: 'Thank you for registering on Los Jawa Roleplay. Please click the button below to verify your email address and complete your UCP account activation.',
    buttonText: 'Verify Email Address',
    buttonUrl: link,
    expiryNote: 'This verification link will expire in 24 hours. If you did not create a UCP account on Los Jawa Roleplay, no further action is required.',
  });

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Los Jawa RP" <${from}>`,
    to: email,
    subject: 'Verify your Los Jawa RP UCP Account',
    html,
  });
}

export async function sendPasswordResetEmail(email: string, token: string, requestOrBaseUrl?: Request | string) {
  const baseUrl = resolveBaseUrl(requestOrBaseUrl);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@losjawa-rp.fun';
  const link = `${baseUrl}/reset-password?token=${token}`;

  const html = buildEnterpriseEmailHtml({
    baseUrl,
    preheader: 'Reset your UCP account password on Los Jawa Roleplay.',
    title: 'Reset Your Password',
    subtitle: 'We received a request to reset the password for your Los Jawa Roleplay UCP account. Click the button below to choose a new password.',
    buttonText: 'Reset Password',
    buttonUrl: link,
    expiryNote: 'This password reset link is valid for 1 hour. If you did not request a password reset, please secure your account immediately.',
  });

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Los Jawa RP Security" <${from}>`,
    to: email,
    subject: 'Reset your Los Jawa RP Password',
    html,
  });
}

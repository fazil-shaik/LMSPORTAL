import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Generate a random 6-digit numeric OTP
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isEmailConfigured(): boolean {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD;
  return Boolean(user && pass);
}

function getTransporter() {
  const service = process.env.SMTP_SERVICE?.trim(); // e.g. 'gmail'
  const host = process.env.SMTP_HOST?.trim() || (service ? undefined : 'smtp.gmail.com');
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  // Strip any accidental spaces from Google App Password (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
  const rawPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD || '').trim();
  const pass = rawPass.replace(/\s+/g, '');

  if (service && user && pass) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return null;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mode: 'smtp' | 'ethereal' | 'mock';
}

/**
 * Sends a 6-digit verification OTP email to the user.
 */
export async function sendVerificationOtpEmail(
  toEmail: string,
  name: string,
  otp: string
): Promise<SendEmailResult> {
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const configuredFrom = process.env.SMTP_FROM?.trim();
  const fromAddress =
    configuredFrom && !configuredFrom.includes('no-reply@internwala.com')
      ? configuredFrom
      : user
        ? `"InternWala" <${user}>`
        : '"InternWala" <no-reply@internwala.com>';

  const subject = `Your InternWala Verification Code: ${otp}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>InternWala Verification Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 28px 24px; text-align: center; }
        .logo { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
        .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .otp-container { text-align: center; margin: 28px 0; }
        .otp-badge { display: inline-block; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 34px; font-weight: 700; letter-spacing: 10px; color: #4f46e5; background: #eef2ff; border: 2px dashed #6366f1; border-radius: 10px; padding: 14px 28px; text-indent: 10px; }
        .expiry-note { font-size: 13px; color: #64748b; text-align: center; margin-top: 12px; }
        .security-box { margin-top: 24px; padding: 12px 16px; background-color: #f1f5f9; border-radius: 8px; font-size: 12px; color: #64748b; line-height: 1.5; }
        .footer { padding: 20px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">InternWala</div>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name ? name : 'Learner'},</div>
          <div class="text">
            Thank you for choosing InternWala. To complete your email verification and unlock course purchases and verified internships, enter the 6-digit OTP below:
          </div>
          <div class="otp-container">
            <div class="otp-badge">${otp}</div>
            <div class="expiry-note">⏳ This code expires in 10 minutes.</div>
          </div>
          <div class="security-box">
            🔒 <strong>Security Tip:</strong> Never share this code with anyone. InternWala staff will never ask for your verification code.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} InternWala Inc. All rights reserved.<br>
          If you didn't create an account, you can safely ignore this email.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Hello ${name || 'Learner'},\n\nYour 6-digit InternWala verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, please ignore this email.\n\n- InternWala Team`;

  const transporter = getTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      return {
        success: true,
        messageId: info.messageId,
        mode: 'smtp',
      };
    } catch (smtpErr: any) {
      return {
        success: false,
        error: smtpErr?.message || 'SMTP delivery failed.',
        mode: 'smtp',
      };
    }
  }

  return {
    success: false,
    error: 'SMTP service is not configured.',
    mode: 'smtp',
  };
}

/**
 * Sends a password reset email to the user.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  name: string,
  resetUrl: string
): Promise<SendEmailResult> {
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const configuredFrom = process.env.SMTP_FROM?.trim();
  const fromAddress =
    configuredFrom && !configuredFrom.includes('no-reply@internwala.com')
      ? configuredFrom
      : user
        ? `"InternWala" <${user}>`
        : '"InternWala" <no-reply@internwala.com>';

  const subject = 'Reset your InternWala password';
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset your password</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 28px 24px; text-align: center; }
        .logo { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
        .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; }
        .footer { padding: 20px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">InternWala</div>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name ? name : 'Learner'},</div>
          <div class="text">
            We received a request to reset your password for your InternWala account. Click the button below to choose a new password:
          </div>
          <div class="btn-container">
            <a href="${resetUrl}" class="btn">Reset Password</a>
          </div>
          <div class="text" style="font-size: 12px; color: #64748b;">
            This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} InternWala Inc. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Hello ${name || 'Learner'},\n\nWe received a request to reset your password. Please open the link below to set a new password:\n${resetUrl}\n\nThis link is valid for 1 hour.\n\n- InternWala Team`;

  const transporter = getTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      return {
        success: true,
        messageId: info.messageId,
        mode: 'smtp',
      };
    } catch (smtpErr: any) {
      return {
        success: false,
        error: smtpErr?.message || 'Failed to send password reset email.',
        mode: 'smtp',
      };
    }
  }

  return {
    success: false,
    error: 'SMTP service is not configured.',
    mode: 'smtp',
  };
}

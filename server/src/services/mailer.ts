import nodemailer from 'nodemailer';

/**
 * SMTP mailer. Configure via env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * If SMTP is not configured (typical in dev), emails are not sent — the
 * message is logged to the console instead so the flow stays testable.
 */
const smtpConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter: nodemailer.Transporter | null = null;
const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    return transporter;
};

export const sendMail = async (to: string, subject: string, html: string): Promise<boolean> => {
    if (!smtpConfigured()) {
        console.log(`[mailer] SMTP not configured — would send to ${to}: "${subject}"`);
        console.log(`[mailer] Body:\n${html.replace(/<[^>]+>/g, '')}`);
        return false;
    }
    try {
        await getTransporter().sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            html,
        });
        return true;
    } catch (err) {
        console.error('[mailer] send failed:', err);
        return false;
    }
};

export const sendPasswordResetEmail = async (to: string, resetUrl: string): Promise<boolean> => {
    const html = `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0a0a;color:#eee;border-radius:12px">
  <h2 style="font-weight:300">Reset your RealPrep AI password</h2>
  <p style="color:#aaa;font-size:14px">We received a request to reset your password. This link expires in 30 minutes.</p>
  <p style="margin:28px 0">
    <a href="${resetUrl}" style="background:#fff;color:#000;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px">Reset Password</a>
  </p>
  <p style="color:#666;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
  <p style="color:#666;font-size:12px">Or paste this link: ${resetUrl}</p>
</div>`;
    return sendMail(to, 'Reset your RealPrep AI password', html);
};

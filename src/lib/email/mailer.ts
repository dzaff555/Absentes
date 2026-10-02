import nodemailer from 'nodemailer';

const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.mailtrap.io';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '2525', 10);
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Daily Attendance <no-reply@dailyattendance.com>';

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string,
  username: string
): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-vercel-app.vercel.app';
  const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #0f2747 0%, #1e40af 100%); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Daily Attendance</h1>
        <p style="color: #93c5fd; margin: 8px 0 0 0; font-size: 14px;">Permintaan Atur Ulang Password</p>
      </div>
      <div style="padding: 32px 28px; color: #1e293b;">
        <p style="font-size: 16px; margin: 0 0 16px 0;">Halo, <strong>${username}</strong>!</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
          Kami menerima permintaan untuk mengatur ulang password akun Daily Attendance Anda. Jika Anda yang meminta ini, silakan klik tombol di bawah ini:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
            Atur Ulang Password
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 24px 0 0 0;">
          Link ini hanya berlaku selama <strong>1 jam</strong> dan hanya dapat digunakan 1 kali. Jika Anda tidak meminta perubahan ini, abaikan email ini dan akun Anda tetap aman.
        </p>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; word-break: break-all;">
          Jika tombol di atas tidak berfungsi, copy tautan berikut ke browser Anda:<br>
          <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        &copy; ${new Date().getFullYear()} Daily Attendance System. All rights reserved.
      </div>
    </div>
  `;

  // Check if SMTP is configured
  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    console.log('====================================================');
    console.log('📧 [MOCK EMAIL DISPATCH - SMTP credentials not configured]');
    console.log(`To: ${toEmail} (${username})`);
    console.log(`Reset URL: ${resetLink}`);
    console.log('====================================================');
    return { success: true, previewUrl: resetLink };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: EMAIL_FROM,
      to: toEmail,
      subject: 'Atur Ulang Password - Daily Attendance',
      html: htmlContent,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[Nodemailer Error]:', error.message || error);
    return { success: false, error: error.message };
  }
}

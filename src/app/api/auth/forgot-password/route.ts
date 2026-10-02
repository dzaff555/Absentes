import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/database/db';
import { sendPasswordResetEmail } from '@/lib/email/mailer';
import { User } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists
    const users = await query<User[]>(
      'SELECT id, username, email FROM users WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (!users || users.length === 0) {
      // Don't leak whether email exists for security, return friendly success
      return NextResponse.json({
        success: true,
        message: 'Jika email terdaftar, instruksi atur ulang password telah dikirim ke email Anda.',
      });
    }

    const user = users[0];
    if (!user.email) {
      return NextResponse.json({
        success: true,
        message: 'Jika email terdaftar, instruksi atur ulang password telah dikirim ke email Anda.',
      });
    }

    // Generate random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store in password_reset_tokens table
    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES (?, ?, ?, ?)',
      [user.id, resetToken, expiresAt, false]
    );

    // Send email
    const emailResult = await sendPasswordResetEmail(user.email, resetToken, user.username);

    return NextResponse.json({
      success: true,
      message: 'Instruksi atur ulang password telah dikirim ke email Anda. Silakan cek inbox atau spam.',
      previewUrl: emailResult.previewUrl, // Provided for local development if SMTP not configured
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses permintaan.';
    console.error('[Forgot Password Error]:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

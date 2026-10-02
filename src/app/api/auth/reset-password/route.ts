import { NextResponse } from 'next/server';
import { query } from '@/lib/database/db';
import { hashPassword } from '@/lib/auth/auth';
import { PasswordResetToken } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token reset password tidak ditemukan.' },
        { status: 400 }
      );
    }

    if (!password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Password baru dan konfirmasi password wajib diisi.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password baru minimal harus memiliki 8 karakter.' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Password baru dan Konfirmasi Password tidak sama.' },
        { status: 400 }
      );
    }

    // Look up token
    const tokens = await query<PasswordResetToken[]>(
      'SELECT id, user_id, token, expires_at, used FROM password_reset_tokens WHERE token = ? LIMIT 1',
      [token]
    );

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Link reset password tidak valid.' },
        { status: 400 }
      );
    }

    const resetRecord = tokens[0];

    // Check if token already used
    if (resetRecord.used) {
      return NextResponse.json(
        { success: false, error: 'Link reset password ini sudah pernah digunakan sebelumnya.' },
        { status: 400 }
      );
    }

    // Check if expired
    const expiresAt = new Date(resetRecord.expires_at).getTime();
    if (Date.now() > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Link reset password sudah tidak berlaku (kedaluwarsa).' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update user password
    await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resetRecord.user_id]);

    // Mark token as used
    await query('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [resetRecord.id]);

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah. Silakan login dengan password baru Anda.',
    });
  } catch (error: any) {
    console.error('[Reset Password Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan saat mengubah password.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { comparePassword, hashPassword } from '@/lib/auth/auth';
import { getDbPool, query } from '@/lib/database/db';

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Data perubahan password tidak valid.' },
        { status: 400 }
      );
    }

    const { username, currentPassword, newPassword, confirmNewPassword } = body as Record<string, unknown>;
    if (
      typeof username !== 'string' ||
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      typeof confirmNewPassword !== 'string' ||
      !username.trim() ||
      !currentPassword ||
      !newPassword ||
      !confirmNewPassword
    ) {
      return NextResponse.json(
        { success: false, error: 'Username dan semua kolom password wajib diisi.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password baru minimal harus memiliki 8 karakter.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmNewPassword) {
      return NextResponse.json(
        { success: false, error: 'Password baru dan konfirmasinya tidak sama.' },
        { status: 400 }
      );
    }

    const users = await query<{ id: number; password: string; status: string }[]>(
      'SELECT id, password, status FROM users WHERE username = ? LIMIT 1',
      [username.trim()]
    );
    const user = users[0];

    if (!user || user.status !== 'ACTIVE' || !(await comparePassword(currentPassword, user.password))) {
      return NextResponse.json(
        { success: false, error: 'Username atau password saat ini salah.' },
        { status: 400 }
      );
    }

    if (await comparePassword(newPassword, user.password)) {
      return NextResponse.json(
        { success: false, error: 'Password baru harus berbeda dari password saat ini.' },
        { status: 400 }
      );
    }

    const newPasswordHash = await hashPassword(newPassword);
    const connection = await getDbPool().getConnection();

    try {
      await connection.beginTransaction();
      const [updateResult] = await connection.query(
        'UPDATE users SET password = ? WHERE id = ? AND password = ? AND status = ?',
        [newPasswordHash, user.id, user.password, 'ACTIVE']
      );

      if (!('affectedRows' in updateResult) || updateResult.affectedRows !== 1) {
        await connection.rollback();
        return NextResponse.json(
          { success: false, error: 'Akun baru saja berubah. Silakan coba lagi.' },
          { status: 409 }
        );
      }

      await connection.commit();
    } catch (error: unknown) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah. Silakan login dengan password baru.',
    });
  } catch (error: unknown) {
    console.error('[Forgot Password API Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengubah password.' },
      { status: 500 }
    );
  }
}

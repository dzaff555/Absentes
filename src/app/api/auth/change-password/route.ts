import { NextResponse } from 'next/server';
import { comparePassword, getSessionUser, hashPassword } from '@/lib/auth/auth';
import { getDbPool, query } from '@/lib/database/db';

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Silakan login untuk mengubah password.' },
      { status: 401 }
    );
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Data perubahan password tidak valid.' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword, confirmNewPassword } = body as Record<string, unknown>;
    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      typeof confirmNewPassword !== 'string' ||
      !currentPassword ||
      !newPassword ||
      !confirmNewPassword
    ) {
      return NextResponse.json(
        { success: false, error: 'Password saat ini, password baru, dan konfirmasi wajib diisi.' },
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

    const users = await query<{ id: number; password: string }[]>(
      'SELECT id, password FROM users WHERE id = ? LIMIT 1',
      [session.id]
    );
    const user = users[0];

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Akun tidak ditemukan.' },
        { status: 404 }
      );
    }

    if (!(await comparePassword(currentPassword, user.password))) {
      return NextResponse.json(
        { success: false, error: 'Password saat ini yang dimasukkan salah.' },
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
    const dbPool = getDbPool();
    const connection = await dbPool.getConnection();

    try {
      await connection.beginTransaction();
      const [updateResult] = await connection.query(
        'UPDATE users SET password = ? WHERE id = ? AND password = ?',
        [newPasswordHash, session.id, user.password]
      );

      if (!('affectedRows' in updateResult) || updateResult.affectedRows !== 1) {
        await connection.rollback();
        return NextResponse.json(
          { success: false, error: 'Password akun baru saja berubah. Muat ulang halaman dan coba lagi.' },
          { status: 409 }
        );
      }

      await connection.query(
        'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0',
        [session.id]
      );
      await connection.commit();
    } catch (error: unknown) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah.',
    });
  } catch (error: unknown) {
    console.error('[Change Password API Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengubah password.' },
      { status: 500 }
    );
  }
}

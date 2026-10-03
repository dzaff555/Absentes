import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSessionUser, hashPassword } from '@/lib/auth/auth';
import { query } from '@/lib/database/db';
import { ATTENDANCE_ROLES, AttendanceRole } from '@/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Izin Administrator diperlukan.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = Number.parseInt(id, 10);
    if (!Number.isInteger(userId)) {
      return NextResponse.json({ success: false, error: 'ID user tidak valid.' }, { status: 400 });
    }

    const users = await query<{
      id: number;
      username: string;
      role: 'USER' | 'ADMIN';
      status: 'ACTIVE' | 'DISABLED';
      created_at: string;
      attendance_role: string | null;
      profile_photo: string | null;
      roblox_username: string | null;
      discord_username: string | null;
      last_attendance: string | null;
      last_attendance_status: string | null;
    }[]>(
      `SELECT id, username, role, status,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at,
        attendance_role, profile_photo, roblox_username, discord_username,
        (SELECT DATE_FORMAT(attendance_date, '%Y-%m-%d') FROM attendance
         WHERE user_id = users.id ORDER BY attendance_date DESC, attendance_time DESC LIMIT 1) AS last_attendance,
        (SELECT status FROM attendance
         WHERE user_id = users.id ORDER BY attendance_date DESC, attendance_time DESC LIMIT 1) AS last_attendance_status
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (!users[0]) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: users[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat detail user.';
    console.error('[Admin User Detail Error]:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Izin Administrator diperlukan.' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const targetUserId = parseInt(resolvedParams.id, 10);

    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { success: false, error: 'ID user tidak valid.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { role, status, attendance_role: attendanceRole } = body;
    const hasUsername = Object.prototype.hasOwnProperty.call(body, 'username');
    const username = hasUsername && typeof body.username === 'string' ? body.username.trim() : '';

    if (hasUsername && (username.length < 3 || username.length > 50)) {
      return NextResponse.json(
        { success: false, error: 'Username harus berisi 3–50 karakter.' },
        { status: 400 }
      );
    }

    if (
      attendanceRole !== undefined &&
      (typeof attendanceRole !== 'string' ||
        !ATTENDANCE_ROLES.includes(attendanceRole as AttendanceRole))
    ) {
      return NextResponse.json({ success: false, error: 'Role absensi tidak valid.' }, { status: 400 });
    }

    // Prevent admin from disabling or demoting their own logged-in account
    if (session.id === targetUserId) {
      if (status === 'DISABLED') {
        return NextResponse.json(
          { success: false, error: 'Anda tidak dapat menonaktifkan akun Anda sendiri.' },
          { status: 400 }
        );
      }
      if (role === 'USER') {
        return NextResponse.json(
          { success: false, error: 'Anda tidak dapat mencabut hak akses admin akun Anda sendiri.' },
          { status: 400 }
        );
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (hasUsername) {
      const existingUsers = await query<{ id: number }[]>(
        'SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1',
        [username, targetUserId]
      );
      if (existingUsers.length > 0) {
        return NextResponse.json({ success: false, error: 'Username sudah digunakan.' }, { status: 409 });
      }
      updates.push('username = ?');
      values.push(username);
    }

    if (role && (role === 'USER' || role === 'ADMIN')) {
      updates.push('role = ?');
      values.push(role);
    }

    if (status && (status === 'ACTIVE' || status === 'DISABLED')) {
      updates.push('status = ?');
      values.push(status);
    }

    if (attendanceRole !== undefined) {
      updates.push('attendance_role = ?');
      values.push(attendanceRole);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada perubahan yang dikirim.' },
        { status: 400 }
      );
    }

    values.push(targetUserId);

    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    return NextResponse.json({
      success: true,
      message: 'Data user berhasil diperbarui.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui data user.';
    console.error('[Update User Error]:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Izin Administrator diperlukan.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = Number.parseInt(id, 10);
    if (!Number.isInteger(userId)) {
      return NextResponse.json({ success: false, error: 'ID user tidak valid.' }, { status: 400 });
    }

    const temporaryPassword = randomBytes(18).toString('base64url');
    const result = await query<{ affectedRows: number }>(
      'UPDATE users SET password = ? WHERE id = ?',
      [await hashPassword(temporaryPassword), userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, data: { temporaryPassword } },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal membuat password baru.';
    console.error('[Admin Password Reset Error]:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Izin Administrator diperlukan.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = Number.parseInt(id, 10);
    if (!Number.isInteger(userId)) {
      return NextResponse.json({ success: false, error: 'ID user tidak valid.' }, { status: 400 });
    }
    if (session.id === userId) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak dapat menghapus akun yang sedang digunakan.' },
        { status: 400 }
      );
    }

    const result = await query<{ affectedRows: number }>(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Akun dan riwayat absensinya berhasil dihapus.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus akun.';
    console.error('[Admin User Delete Error]:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

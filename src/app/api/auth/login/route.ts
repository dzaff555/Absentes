import { NextResponse } from 'next/server';
import { query, testConnection } from '@/lib/database/db';
import { comparePassword, signToken, TOKEN_COOKIE_NAME } from '@/lib/auth/auth';
import { User, AuthSession, AttendanceRole } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, rememberMe } = body;

    const hasMySqlConfig = Boolean(process.env.DB_HOST || process.env.DB_USER || process.env.DB_PORT || process.env.DB_PASSWORD || process.env.DB_NAME);
    const demoLoginEnabled =
      process.env.ALLOW_DEMO_LOGIN === 'true' ||
      process.env.NO_DATABASE === 'true' ||
      process.env.USE_LOCAL_DATA === 'true' ||
      (!hasMySqlConfig && process.env.NODE_ENV !== 'production');
    const adminDemoUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
    const adminDemoPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (demoLoginEnabled) {
      const demoAccounts: Record<string, { id: number; username: string; email: string; role: 'ADMIN' | 'USER'; status: 'ACTIVE'; attendance_role: AttendanceRole; profile_completed: boolean; password: string }> = {
        [adminDemoUsername]: {
          id: 1,
          username: adminDemoUsername,
          email: process.env.ADMIN_EMAIL || 'admin@dailyattendance.local',
          role: 'ADMIN',
          status: 'ACTIVE',
          attendance_role: 'CSOT',
          profile_completed: true,
          password: adminDemoPassword,
        },
        user: {
          id: 2,
          username: 'user',
          email: 'user@dailyattendance.local',
          role: 'USER',
          status: 'ACTIVE',
          attendance_role: 'CSOT',
          profile_completed: true,
          password: 'user123',
        },
      };

      const normalizedUsername = String(username || '').trim();
      const candidate = demoAccounts[normalizedUsername] || demoAccounts[normalizedUsername.toLowerCase()];

      if (!candidate) {
        return NextResponse.json(
          { success: false, error: 'Username demo tidak ditemukan. Coba admin atau user.' },
          { status: 401 }
        );
      }

      if (String(password || '') !== candidate.password) {
        return NextResponse.json(
          { success: false, error: 'Password demo salah.' },
          { status: 401 }
        );
      }

      const sessionPayload: AuthSession = {
        id: candidate.id,
        username: candidate.username,
        email: candidate.email,
        role: candidate.role,
        status: candidate.status,
        attendance_role: candidate.attendance_role,
        profile_completed: candidate.profile_completed,
      };

      const expiresIn = rememberMe ? '30d' : '7d';
      const token = signToken(sessionPayload, expiresIn);
      const redirectUrl = candidate.role === 'ADMIN' ? '/admin/dashboard' : candidate.profile_completed ? '/dashboard' : '/complete-profile';

      const response = NextResponse.json({
        success: true,
        message: 'Login berhasil! (demo mode)',
        data: {
          user: sessionPayload,
          redirectUrl,
        },
      });

      const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
      response.cookies.set({
        name: TOKEN_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge,
      });

      return response;
    }

    // Check connection first
    const connCheck = await testConnection();
    if (!connCheck.connected) {
      return NextResponse.json(
        {
          success: false,
          error: 'Koneksi database gagal. Periksa nilai DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, dan DB_NAME di environment Vercel/server.',
        },
        { status: 503 }
      );
    }

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username dan password wajib diisi.' },
        { status: 400 }
      );
    }

    // Query user by username or email
    const users = await query<User[]>(
      'SELECT id, username, email, password, role, status FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username.trim(), username.trim()]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ID atau password salah.' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Check account status
    if (user.status === 'DISABLED') {
      return NextResponse.json(
        { success: false, error: 'Akun Anda telah dinonaktifkan oleh Administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password || '');
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'ID atau password salah.' },
        { status: 401 }
      );
    }

    // Create session payload
    let profileData: {
      attendance_role?: string | null;
      profile_completed?: boolean | number | string | null;
    } = {};

    try {
      const profileRows = await query<{
        attendance_role?: string | null;
        profile_completed?: number | boolean | null;
      }[]>(
        'SELECT attendance_role, profile_completed FROM users WHERE id = ? LIMIT 1',
        [user.id]
      );

      if (profileRows && profileRows.length > 0) {
        profileData = profileRows[0];
      }
    } catch {
      profileData = {};
    }

    const normalizedAttendanceRole: AttendanceRole =
      profileData.attendance_role === 'CSOT' ||
      profileData.attendance_role === 'PPKA' ||
      profileData.attendance_role === 'MASINIS' ||
      profileData.attendance_role === 'PKD' ||
      profileData.attendance_role === 'PJL'
        ? profileData.attendance_role
        : 'CSOT';

    const profileCompleted =
      profileData.profile_completed === true ||
      profileData.profile_completed === 1 ||
      profileData.profile_completed === '1';

    const sessionPayload: AuthSession = {
      id: user.id,
      username: user.username,
      email: user.email || '',
      role: user.role,
      status: user.status,
      attendance_role: normalizedAttendanceRole,
      profile_completed: profileCompleted,
    };

    const expiresIn = rememberMe ? '30d' : '7d';
    const token = signToken(sessionPayload, expiresIn);

    const redirectUrl = user.role === 'ADMIN' ? '/admin/dashboard' : profileCompleted ? '/dashboard' : '/complete-profile';

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil!',
      data: {
        user: sessionPayload,
        redirectUrl,
      },
    });

    // Set secure cookie
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan pada server saat proses login.';
    console.error('[Login API Error]:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

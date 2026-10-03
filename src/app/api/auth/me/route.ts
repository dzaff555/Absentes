import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/auth';
import { query } from '@/lib/database/db';

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Belum login atau session telah kedaluwarsa.' },
      { status: 401 }
    );
  }

  let user: {
    attendance_role?: string | null;
    profile_photo?: string | null;
    roblox_username?: string | null;
    discord_username?: string | null;
    profile_completed?: boolean | number | null;
  } | null = null;

  try {
    const userRows = await query<{
      attendance_role?: string | null;
      profile_photo?: string | null;
      roblox_username?: string | null;
      discord_username?: string | null;
      profile_completed?: boolean | number | null;
    }[]>(
      'SELECT attendance_role, profile_photo, roblox_username, discord_username, profile_completed FROM users WHERE id = ? LIMIT 1',
      [session.id]
    );
    user = userRows[0] || null;
  } catch {
    user = null;
  }

  const payload = {
    id: session.id,
    username: session.username,
    role: session.role,
    status: session.status,
    attendance_role: user?.attendance_role || 'CSOT',
    profile_photo: user?.profile_photo || null,
    roblox_username: user?.roblox_username || null,
    discord_username: user?.discord_username || null,
    profile_completed: Boolean(user?.profile_completed),
  };

  return NextResponse.json({
    success: true,
    data: payload,
  });
}

import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { getSessionUser } from '@/lib/auth/auth';
import { query } from '@/lib/database/db';
import { AuthSession } from '@/types';

interface UserLayoutSession extends AuthSession {
  profile_photo: string | null;
}

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (session.role === 'ADMIN') redirect('/admin/dashboard');

  const users = await query<UserLayoutSession[]>(
    `SELECT id, username, COALESCE(email, '') AS email, role, status,
      attendance_role, profile_photo, roblox_username, discord_username,
      profile_completed
     FROM users
     WHERE id = ? AND role = 'USER' AND status = 'ACTIVE'
     LIMIT 1`,
    [session.id]
  );
  const user = users[0];
  if (!user) redirect('/login');

  return <AppLayout user={user}>{children}</AppLayout>;
}

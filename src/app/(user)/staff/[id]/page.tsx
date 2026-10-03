import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, UserRound } from 'lucide-react';
import { query } from '@/lib/database/db';
import { formatIndonesianDate } from '@/lib/utils/date';

interface StaffProfile {
  id: number;
  username: string;
  attendance_role: string | null;
  profile_photo: string | null;
  roblox_username: string | null;
  discord_username: string | null;
  last_attendance: string | null;
  last_attendance_status: string | null;
}

export default async function StaffProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staffId = Number.parseInt(id, 10);
  if (!Number.isInteger(staffId)) notFound();

  const staffRows = await query<StaffProfile[]>(
    `SELECT u.id, u.username, u.attendance_role, u.profile_photo,
      u.roblox_username, u.discord_username,
      (SELECT DATE_FORMAT(a.attendance_date, '%Y-%m-%d') FROM attendance a
       WHERE a.user_id = u.id ORDER BY a.attendance_date DESC, a.attendance_time DESC LIMIT 1) AS last_attendance,
      (SELECT a.status FROM attendance a
       WHERE a.user_id = u.id ORDER BY a.attendance_date DESC, a.attendance_time DESC LIMIT 1) AS last_attendance_status
     FROM users u WHERE u.id = ? AND u.role = 'USER' AND u.status = 'ACTIVE' LIMIT 1`,
    [staffId]
  );
  const staff = staffRows[0];
  if (!staff) notFound();

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/staff" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke List Staff
        </Link>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 bg-gradient-to-r from-[#0F2747] to-[#2563EB] p-6 text-white sm:flex-row sm:items-center">
            {staff.profile_photo ? (
              <img
                src={staff.profile_photo}
                alt={`Foto profil ${staff.username}`}
                className="h-24 w-24 rounded-2xl border-2 border-white/70 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-white/40 bg-white/10 text-3xl font-bold">
                {staff.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Profil Staff</p>
              <h1 className="mt-1 text-2xl font-extrabold">{staff.username}</h1>
              <p className="mt-1 text-sm text-blue-100">{staff.attendance_role || 'Role belum ditentukan'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <UserRound className="h-4 w-4" /> Username Roblox
              </div>
              <p className="mt-2 break-words text-sm font-bold text-slate-800">{staff.roblox_username || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <UserRound className="h-4 w-4" /> Username Discord
              </div>
              <p className="mt-2 break-words text-sm font-bold text-slate-800">{staff.discord_username || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <CalendarDays className="h-4 w-4" /> Absensi Terakhir
              </div>
              <p className="mt-2 text-sm font-bold text-slate-800">
                {staff.last_attendance
                  ? `${formatIndonesianDate(staff.last_attendance)} · ${staff.last_attendance_status || 'Tercatat'}`
                  : 'Belum pernah absen'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
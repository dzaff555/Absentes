import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/auth';
import { query } from '@/lib/database/db';
import { resolveAttendanceDateRange } from '@/lib/admin/attendance-report';
import { getJakartaDateString } from '@/lib/utils/date';
import { ATTENDANCE_ROLES } from '@/types';

interface AttendanceStatisticsRecord {
  id: number;
  username: string;
  attendance_role: string;
  created_at: string;
  attended_days: number;
}

export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Izin Administrator diperlukan.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { startDate, endDate } = resolveAttendanceDateRange(
      searchParams.get('startDate') || undefined,
      searchParams.get('endDate') || undefined
    );
    const attendanceRole = searchParams.get('attendanceRole')?.trim() || 'ALL';
    const search = searchParams.get('search')?.trim() || '';
    const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = 15;
    const offset = (page - 1) * limit;

    if (
      attendanceRole !== 'ALL' &&
      !ATTENDANCE_ROLES.includes(attendanceRole as (typeof ATTENDANCE_ROLES)[number])
    ) {
      return NextResponse.json(
        { success: false, error: 'Filter role absensi tidak valid.' },
        { status: 400 }
      );
    }

    const conditions = ["u.role = 'USER'", "u.status = 'ACTIVE'"];
    const userParams: unknown[] = [];
    if (attendanceRole !== 'ALL') {
      conditions.push('u.attendance_role = ?');
      userParams.push(attendanceRole);
    }
    if (search) {
      conditions.push('(u.username LIKE ? OR u.attendance_role LIKE ?)');
      const term = `%${search}%`;
      userParams.push(term, term);
    }
    const whereSql = conditions.join(' AND ');
    const countResult = await query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM users u WHERE ${whereSql}`,
      userParams
    );
    const totalItems = Number(countResult[0]?.total || 0);
    const totalPages = Math.ceil(totalItems / limit) || 1;

    const today = getJakartaDateString();
    const effectiveEndDate = endDate < today ? endDate : today;
    const records = await query<AttendanceStatisticsRecord[]>(
      `SELECT
        u.id,
        u.username,
        u.attendance_role,
        DATE_FORMAT(u.created_at, '%Y-%m-%d') AS created_at,
        COUNT(DISTINCT a.attendance_date) AS attended_days
      FROM users u
      LEFT JOIN attendance a
        ON a.user_id = u.id
        AND a.attendance_date >= GREATEST(?, DATE(u.created_at))
        AND a.attendance_date <= ?
      WHERE ${whereSql}
      GROUP BY u.id, u.username, u.attendance_role, u.created_at
      ORDER BY u.username ASC
      LIMIT ? OFFSET ?`,
      [startDate, effectiveEndDate, ...userParams, limit, offset]
    );

    const effectiveDays = records.map((record) => {
      const eligibleStartDate =
        record.created_at > startDate ? record.created_at : startDate;
      const expectedDays =
        eligibleStartDate <= effectiveEndDate
          ? Math.floor(
              (Date.parse(`${effectiveEndDate}T00:00:00.000Z`) -
                Date.parse(`${eligibleStartDate}T00:00:00.000Z`)) /
                86_400_000
            ) + 1
          : 0;
      const attendedDays = Math.min(Number(record.attended_days || 0), expectedDays);

      return {
        ...record,
        attended_days: attendedDays,
        absent_days: Math.max(0, expectedDays - attendedDays),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        records: effectiveDays,
        dateRange: { startDate, endDate },
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          pageSize: limit,
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof RangeError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    console.error('[Admin Attendance Statistics Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat statistik absensi.' },
      { status: 500 }
    );
  }
}

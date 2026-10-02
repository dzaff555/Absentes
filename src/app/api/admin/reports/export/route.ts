import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/auth';
import { query } from '@/lib/database/db';
import { getJakartaDateString } from '@/lib/utils/date';

export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate')?.trim();
    const endDate = searchParams.get('endDate')?.trim();
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status')?.trim();
    const attendanceRole = searchParams.get('attendanceRole')?.trim();

    const whereConditions: string[] = ['1=1'];
    const params: unknown[] = [];

    if (startDate) {
      whereConditions.push('a.attendance_date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('a.attendance_date <= ?');
      params.push(endDate);
    }

    if (status && status !== 'ALL') {
      whereConditions.push('a.status = ?');
      params.push(status);
    }

    if (attendanceRole && attendanceRole !== 'ALL') {
      whereConditions.push('a.attendance_role = ?');
      params.push(attendanceRole);
    }

    if (search) {
      whereConditions.push(
        '(a.name LIKE ? OR a.attendance_role LIKE ? OR a.discord_username LIKE ? OR a.roblox_username LIKE ? OR u.username LIKE ? OR u.email LIKE ?)'
      );
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term);
    }

    const whereClause = whereConditions.join(' AND ');

    const dataSql = `
      SELECT 
        a.id,
        DATE_FORMAT(a.attendance_date, '%Y-%m-%d') as attendance_date,
        a.name,
        u.id as user_id,
        u.username,
        u.email,
        a.attendance_role,
        a.discord_username,
        a.roblox_username,
        a.attendance_time,
        a.status
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE ${whereClause}
      ORDER BY a.attendance_date DESC, a.attendance_time DESC
    `;

    const records = await query<Record<string, unknown>[]>(dataSql, params);

    const delimiter = ';';
    const csvHeaders = [
      'No',
      'Tanggal Absen',
      'Nama Lengkap',
      'User ID',
      'Username',
      'Email',
      'Role Absensi',
      'Discord',
      'Roblox',
      'Jam Absen',
      'Status',
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined || val === '') return '""';

      const normalized = String(val)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/"/g, '""');

      return /[;"\n]/.test(normalized) ? `"${normalized}"` : normalized;
    };

    const csvRows = records.map((row, idx) => [
      idx + 1,
      escapeCsv(row.attendance_date),
      escapeCsv(row.name),
      escapeCsv(row.user_id),
      escapeCsv(row.username),
      escapeCsv(row.email),
      escapeCsv(row.attendance_role),
      escapeCsv(row.discord_username),
      escapeCsv(row.roblox_username),
      escapeCsv(row.attendance_time),
      escapeCsv(row.status),
    ]);

    const csvString = [
      csvHeaders.join(delimiter),
      ...csvRows.map((row) => row.join(delimiter)),
    ].join('\r\n');

    const todayStr = getJakartaDateString();
    const filename = `attendance-report-${todayStr}.csv`;

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error('[Export CSV Error]:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

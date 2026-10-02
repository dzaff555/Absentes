import ExcelJS from 'exceljs';
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
    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];

    if (startDate) {
      conditions.push('a.attendance_date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('a.attendance_date <= ?');
      params.push(endDate);
    }
    if (status && status !== 'ALL') {
      conditions.push('a.status = ?');
      params.push(status);
    }
    if (attendanceRole && attendanceRole !== 'ALL') {
      conditions.push('a.attendance_role = ?');
      params.push(attendanceRole);
    }
    if (search) {
      conditions.push(
        '(a.name LIKE ? OR a.attendance_role LIKE ? OR a.discord_username LIKE ? OR a.roblox_username LIKE ? OR u.username LIKE ? OR u.email LIKE ?)'
      );
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term);
    }

    const records = await query<{
      attendance_date: string;
      name: string;
      user_id: number;
      username: string;
      email: string | null;
      attendance_role: string;
      discord_username: string;
      roblox_username: string;
      attendance_time: string;
      status: string;
    }[]>(
      `SELECT DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS attendance_date,
        a.name, u.id AS user_id, u.username, u.email, a.attendance_role,
        a.discord_username, a.roblox_username, a.attendance_time, a.status
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.attendance_date DESC, a.attendance_time DESC`,
      params
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Daily Attendance';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Laporan Absensi');
    sheet.columns = [
      { header: 'No', key: 'number', width: 8 },
      { header: 'Tanggal Absen', key: 'date', width: 16 },
      { header: 'Nama Lengkap', key: 'name', width: 24 },
      { header: 'User ID', key: 'userId', width: 12 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role Absensi', key: 'attendanceRole', width: 18 },
      { header: 'Discord', key: 'discord', width: 22 },
      { header: 'Roblox', key: 'roblox', width: 22 },
      { header: 'Jam Absen', key: 'time', width: 14 },
      { header: 'Status', key: 'status', width: 16 },
    ];

    for (const [index, record] of records.entries()) {
      sheet.addRow({
        number: index + 1,
        date: record.attendance_date,
        name: record.name,
        userId: record.user_id,
        username: record.username,
        email: record.email,
        attendanceRole: record.attendance_role,
        discord: record.discord_username,
        roblox: record.roblox_username,
        time: record.attendance_time,
        status: record.status,
      });
    }

    sheet.columns.forEach((column, index) => {
      const headerLength = String(column.header || '').length;
      const values = sheet.getColumn(index + 1).values;
      const contentLength = values.reduce<number>((maxLength, value) => {
        return Math.max(maxLength, String(value ?? '').length);
      }, headerLength);
      column.width = Math.min(Math.max(contentLength + 2, 12), 42);
    });

    const header = sheet.getRow(1);
    header.height = 24;
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16365F' } };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(records.length + 1, 1), column: 11 },
    };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `attendance-report-${getJakartaDateString()}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error('[Export Excel Error]:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
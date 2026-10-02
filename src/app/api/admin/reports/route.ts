import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/auth';
import { query } from '@/lib/database/db';

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
    const startDate = searchParams.get('startDate')?.trim();
    const endDate = searchParams.get('endDate')?.trim();
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status')?.trim();
    const attendanceRole = searchParams.get('attendanceRole')?.trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    const offset = (page - 1) * limit;

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

    // Total count
    const countSql = `
      SELECT COUNT(*) as total 
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE ${whereClause}
    `;
    const countResult = await query<{ total: number }[]>(countSql, params);
    const totalItems = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    // Data query
    const dataSql = `
      SELECT 
        a.id,
        a.user_id,
        a.name,
        a.attendance_role,
        a.discord_username,
        a.roblox_username,
        DATE_FORMAT(a.attendance_date, '%Y-%m-%d') as attendance_date,
        a.attendance_time,
        a.status,
        a.created_at,
        u.username,
        u.email,
        u.profile_photo
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE ${whereClause}
      ORDER BY a.attendance_date DESC, a.attendance_time DESC
      LIMIT ? OFFSET ?
    `;

    const records = await query<{
      id: number;
      user_id: number;
      name: string;
      attendance_role: string;
      discord_username: string | null;
      roblox_username: string | null;
      attendance_date: string;
      attendance_time: string;
      status: string;
      created_at: string;
      username: string;
      email: string | null;
      profile_photo: string | null;
    }[]>(dataSql, [...params, limit, offset]);

    return NextResponse.json({
      success: true,
      data: {
        records,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          pageSize: limit,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat laporan absensi.';
    console.error('[Admin Reports Error]:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

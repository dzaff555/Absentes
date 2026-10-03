import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/auth';
import {
  countAttendanceReportRecords,
  getAttendanceReportRecords,
  validateAttendanceReportFilters,
} from '@/lib/admin/attendance-report';

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
    const filters = {
      startDate: searchParams.get('startDate')?.trim() || undefined,
      endDate: searchParams.get('endDate')?.trim() || undefined,
      search: searchParams.get('search')?.trim() || undefined,
      status: searchParams.get('status')?.trim() || 'ALL',
      attendanceRole: searchParams.get('attendanceRole')?.trim() || 'ALL',
    };
    validateAttendanceReportFilters(filters);

    const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '15', 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 15;
    const offset = (page - 1) * limit;
    const totalItems = await countAttendanceReportRecords(filters);
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const records = await getAttendanceReportRecords(filters, { limit, offset });

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
    if (error instanceof RangeError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Gagal memuat laporan absensi.';
    console.error('[Admin Reports Error]:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

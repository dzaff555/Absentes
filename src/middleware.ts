import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeJwtPayload } from '@/lib/auth/jwt-edge';

const TOKEN_COOKIE_NAME = 'attendance_token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  const session = token ? decodeJwtPayload(token) : null;

  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password';

  const isAdminRoute = pathname.startsWith('/admin');
  const isUserRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/attendance') ||
    pathname.startsWith('/complete-profile') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/staff');

  // 1. If user is already logged in and visits auth pages (login, register), redirect to their respective dashboard
  if (isAuthRoute && session) {
    if (session.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. Protect Admin routes: require session AND role === 'ADMIN'
  if (isAdminRoute) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== 'ADMIN') {
      // User is not an admin: redirect to user dashboard with access denied error
      const userDashboardUrl = new URL('/dashboard', request.url);
      userDashboardUrl.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(userDashboardUrl);
    }
  }

  // 3. Protect User routes (/dashboard, /attendance)
  if (isUserRoute) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // If admin visits /dashboard directly, they can view it or redirect to /admin/dashboard
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// next-intl URL-based routing is disabled until app pages are migrated
// to [locale] route segments. Language preference is stored in localStorage.
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const ref = request.nextUrl.searchParams.get('ref');
  if (ref && /^[A-Z0-9]{6,12}$/i.test(ref)) {
    response.cookies.set('eidolon_ref', ref.toUpperCase(), {
      maxAge: 60 * 60 * 24,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};

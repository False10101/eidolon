import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// next-intl URL-based routing is disabled until app pages are migrated
// to [locale] route segments. Language preference is stored in localStorage.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};

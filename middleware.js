// Page-level protection (runs before a page renders).
//  * not logged in            -> redirected to /login
//  * STUDENT on an admin page -> redirected to /papers
// API routes are NOT handled here: every API route checks the session and
// role itself on the server (lib/auth.js), which is the real security boundary.
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifyToken } from './lib/token.js';

const PUBLIC = ['/', '/login', '/register'];
const ADMIN_ONLY = [/^\/admin(\/|$)/, /^\/papers\/new$/, /^\/papers\/\d+\/edit$/];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();

  const session = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (ADMIN_ONLY.some((re) => re.test(pathname)) && session.role !== 'ADMIN') {
    const url = new URL('/papers', request.url);
    url.searchParams.set('denied', '1');
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // everything except API routes, Next.js internals and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};

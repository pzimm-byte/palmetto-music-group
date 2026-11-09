import { NextResponse, type NextRequest } from 'next/server';
import { authMode, cookieSecret, isPublicPath } from '@/lib/auth/mode';
import { LOCAL_SESSION_COOKIE, verifyLocalSession } from '@/lib/auth/local-session';
import { neonAuth } from '@/lib/auth/neon';

// Sends signed-out visitors to Sign in. Pages also check membership on the server
// (requireMember), so this is the first gate, not the only one.
export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  if (authMode() === 'local') {
    const ok = await verifyLocalSession(req.cookies.get(LOCAL_SESSION_COOKIE)?.value, cookieSecret());
    if (ok) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = '/sign-in';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return neonAuth().middleware({ loginUrl: '/sign-in' })(req);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|robots.txt).*)'],
};

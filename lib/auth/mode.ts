export type AuthMode = 'neon' | 'local';

/**
 * "neon"  — real Neon Auth (Managed Better Auth). Default, and the only mode allowed on Vercel.
 * "local" — offline development and automated tests. Checks the same neon_auth.user/account
 *           rows with Better Auth's own password hashing, but keeps the session in a signed
 *           cookie instead of calling the Neon Auth service.
 */
export function authMode(): AuthMode {
  const mode = (process.env.AUTH_MODE ?? 'neon').toLowerCase();
  if (mode === 'local') {
    if (process.env.VERCEL) throw new Error('AUTH_MODE=local is not allowed on Vercel deployments');
    return 'local';
  }
  return 'neon';
}

export function cookieSecret(): string {
  const s = process.env.NEON_AUTH_COOKIE_SECRET ?? '';
  if (s.length < 32) throw new Error('NEON_AUTH_COOKIE_SECRET must be at least 32 characters');
  return s;
}

/** Routes reachable while signed out. Everything else requires a member session. */
export const PUBLIC_PATHS = ['/sign-in', '/forgot-password', '/reset-password'];

export function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/api/auth/')) return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

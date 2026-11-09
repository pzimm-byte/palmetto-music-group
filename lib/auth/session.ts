import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { one } from '@/lib/db';
import { authMode, cookieSecret } from './mode';
import { neonAuth } from './neon';
import { LOCAL_SESSION_COOKIE, verifyLocalSession } from './local-session';

export type Member = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'member';
};

/** Email of the signed-in auth user, or null. */
async function sessionEmail(): Promise<string | null> {
  if (authMode() === 'local') {
    const jar = await cookies();
    const userId = await verifyLocalSession(jar.get(LOCAL_SESSION_COOKIE)?.value, cookieSecret());
    if (!userId) return null;
    const row = await one<{ email: string }>('select email from neon_auth."user" where id = $1', [userId]);
    return row?.email ?? null;
  }
  try {
    const { data } = await neonAuth().getSession();
    return data?.user?.email ?? null;
  } catch (e) {
    console.error('getSession failed', e);
    return null;
  }
}

export async function memberByEmail(email: string): Promise<Member | null> {
  return one<Member>(
    'select id, first_name, last_name, email, role from members where lower(email) = lower($1) and active',
    [email],
  );
}

/**
 * The signed-in member. A valid auth session is not enough: the email must also
 * belong to an active row in `members`, which only an admin can create.
 */
export const currentMember = cache(async (): Promise<Member | null> => {
  const email = await sessionEmail();
  if (!email) return null;
  return memberByEmail(email);
});

export async function requireMember(): Promise<Member> {
  const m = await currentMember();
  if (!m) redirect('/sign-in');
  return m;
}

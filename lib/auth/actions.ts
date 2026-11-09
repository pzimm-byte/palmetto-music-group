'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomBytes } from 'node:crypto';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { one, query } from '@/lib/db';
import { authMode, cookieSecret } from './mode';
import { neonAuth } from './neon';
import { memberByEmail } from './session';
import { LOCAL_SESSION_COOKIE, LOCAL_SESSION_MAX_AGE, signLocalSession } from './local-session';

export type FormState = { error?: string; message?: string } | null;

const BAD_LOGIN = "That email and password don't match an account. Check them and try again.";

function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === 'string' ? v : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : '/';
}

export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const next = safeNext(form.get('next'));
  if (!email || !password) return { error: 'Enter your email and password.' };

  // Only people Paul has added (active rows in `members`) may sign in.
  const member = await memberByEmail(email);

  if (authMode() === 'local') {
    const row = await one<{ id: string; password: string | null }>(
      `select u.id, a.password from neon_auth."user" u
         join neon_auth.account a on a."userId" = u.id and a."providerId" = 'credential'
        where lower(u.email) = lower($1)`,
      [email],
    );
    const ok = !!row?.password && (await verifyPassword({ hash: row.password, password }));
    if (!ok || !member) return { error: BAD_LOGIN };
    const jar = await cookies();
    jar.set(LOCAL_SESSION_COOKIE, await signLocalSession(row.id, cookieSecret()), {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: LOCAL_SESSION_MAX_AGE,
    });
    redirect(next);
  }

  const { error } = await neonAuth().signIn.email({ email, password });
  if (error) return { error: BAD_LOGIN };
  if (!member) {
    await neonAuth().signOut();
    return { error: BAD_LOGIN };
  }
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  if (authMode() === 'local') {
    (await cookies()).delete(LOCAL_SESSION_COOKIE);
  } else {
    await neonAuth().signOut();
  }
  redirect('/sign-in');
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

const RESET_SENT = "If that email belongs to a member, we've sent a link to reset the password. It expires in 15 minutes.";

export async function forgotPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim();
  if (!email || !email.includes('@')) return { error: 'Enter the email address on your account.' };
  const redirectTo = `${await origin()}/reset-password`;

  if (authMode() === 'local') {
    const user = await one<{ id: string }>('select id from neon_auth."user" where lower(email) = lower($1)', [email]);
    if (user) {
      const token = randomBytes(24).toString('hex');
      await query(
        `insert into neon_auth.verification (identifier, value, "expiresAt") values ($1, $2, now() + interval '15 minutes')`,
        [`reset-password:${token}`, user.id],
      );
      // Local mode has no mail server: print the link for the developer.
      console.info(`[local auth] password reset link: ${redirectTo}?token=${token}`);
    }
    return { message: RESET_SENT };
  }

  // Same response whether or not the address exists, so the form can't be used to probe accounts.
  const { error } = await neonAuth().requestPasswordReset({ email, redirectTo });
  if (error) console.warn('requestPasswordReset failed', error.message);
  return { message: RESET_SENT };
}

export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get('token') ?? '');
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  if (!token) return { error: 'This reset link is missing its code. Request a new link.' };
  if (password.length < 8) return { error: 'Use at least 8 characters.' };
  if (password !== confirm) return { error: "The two passwords don't match." };

  if (authMode() === 'local') {
    const v = await one<{ id: string; value: string }>(
      `select id, value from neon_auth.verification where identifier = $1 and "expiresAt" > now()`,
      [`reset-password:${token}`],
    );
    if (!v) return { error: 'This reset link has expired or was already used. Request a new link.' };
    await query(`update neon_auth.account set password = $1, "updatedAt" = now() where "userId" = $2 and "providerId" = 'credential'`, [
      await hashPassword(password), v.value,
    ]);
    await query('delete from neon_auth.verification where id = $1', [v.id]);
    redirect('/sign-in?reset=1');
  }

  const { error } = await neonAuth().resetPassword({ newPassword: password, token });
  if (error) return { error: 'This reset link has expired or was already used. Request a new link.' };
  redirect('/sign-in?reset=1');
}

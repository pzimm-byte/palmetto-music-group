import { afterEach, describe, expect, it } from 'vitest';
import { signLocalSession, verifyLocalSession } from '@/lib/auth/local-session';
import { authMode } from '@/lib/auth/mode';

const SECRET = 'x'.repeat(40);

describe('local session cookie', () => {
  it('round-trips a user id', async () => {
    const t = await signLocalSession('user-1', SECRET);
    expect(await verifyLocalSession(t, SECRET)).toBe('user-1');
  });
  it('rejects tampering, wrong secret, expiry and junk', async () => {
    const t = await signLocalSession('user-1', SECRET);
    expect(await verifyLocalSession(t.replace('user-1', 'user-2'), SECRET)).toBeNull();
    expect(await verifyLocalSession(t, 'y'.repeat(40))).toBeNull();
    expect(await verifyLocalSession(t, SECRET, Date.now() + 8 * 86400 * 1000)).toBeNull();
    expect(await verifyLocalSession('nope', SECRET)).toBeNull();
    expect(await verifyLocalSession(undefined, SECRET)).toBeNull();
  });
});

describe('auth mode', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });
  it('defaults to real Neon Auth', () => {
    delete process.env.AUTH_MODE;
    expect(authMode()).toBe('neon');
  });
  it('refuses local mode on Vercel', () => {
    process.env.AUTH_MODE = 'local';
    process.env.VERCEL = '1';
    expect(() => authMode()).toThrow(/not allowed on Vercel/);
  });
});

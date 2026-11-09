// Signed-cookie session used only when AUTH_MODE=local (offline dev and tests).
// Uses Web Crypto so it also runs in the Next.js proxy.
export const LOCAL_SESSION_COOKIE = 'pbc_local_session';
const MAX_AGE_S = 60 * 60 * 24 * 7;

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
}

export async function signLocalSession(userId: string, secret: string, now = Date.now()): Promise<string> {
  const payload = `${userId}.${Math.floor(now / 1000) + MAX_AGE_S}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function verifyLocalSession(token: string | undefined, secret: string, now = Date.now()): Promise<string | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expected = await hmac(secret, `${userId}.${exp}`);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  if (Number(exp) * 1000 < now) return null;
  return userId;
}

export const LOCAL_SESSION_MAX_AGE = MAX_AGE_S;

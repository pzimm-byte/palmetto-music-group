import 'server-only';
import { createNeonAuth, type NeonAuth } from '@neon/auth/next/server';
import { cookieSecret } from './mode';

let instance: NeonAuth | null = null;

export function neonAuth(): NeonAuth {
  if (!instance) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    if (!baseUrl) throw new Error('NEON_AUTH_BASE_URL is not set');
    instance = createNeonAuth({ baseUrl, cookies: { secret: cookieSecret() }, logLevel: 'warn' });
  }
  return instance;
}

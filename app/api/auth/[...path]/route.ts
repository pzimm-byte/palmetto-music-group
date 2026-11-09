import { neonAuth } from '@/lib/auth/neon';
import { authMode } from '@/lib/auth/mode';

type Ctx = { params: Promise<{ path: string[] }> };

function notAvailable() {
  return new Response('Not found', { status: 404 });
}

// Sign-up is disabled in Neon Auth; block it here as well so it can never be reached through the app.
function blocked(req: Request) {
  return new URL(req.url).pathname.includes('/sign-up');
}

async function handle(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', req: Request, ctx: Ctx) {
  if (authMode() === 'local' || blocked(req)) return notAvailable();
  return neonAuth().handler()[method](req, ctx);
}

export const GET = (req: Request, ctx: Ctx) => handle('GET', req, ctx);
export const POST = (req: Request, ctx: Ctx) => handle('POST', req, ctx);
export const PUT = (req: Request, ctx: Ctx) => handle('PUT', req, ctx);
export const PATCH = (req: Request, ctx: Ctx) => handle('PATCH', req, ctx);
export const DELETE = (req: Request, ctx: Ctx) => handle('DELETE', req, ctx);

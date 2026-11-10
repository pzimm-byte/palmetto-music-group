import { Pool, type PoolClient, type QueryResultRow } from 'pg';

declare global {
  var __pbcPool: Pool | undefined;
}

function makePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString) || connectionString.includes('host=/');
  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    ssl: isLocal ? undefined : { rejectUnauthorized: true },
  });
}

export function pool(): Pool {
  if (!globalThis.__pbcPool) globalThis.__pbcPool = makePool();
  return globalThis.__pbcPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query('begin');
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
}

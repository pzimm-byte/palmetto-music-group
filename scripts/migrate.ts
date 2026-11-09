/**
 * Applies db/migrations/*.sql in order (tracked in schema_migrations).
 *   npm run db:migrate                      # uses DATABASE_URL
 *   npm run db:migrate -- --local-auth      # also creates the offline copy of neon_auth tables (local dev/tests only)
 *   npm run db:migrate -- --print-sql       # print the SQL instead of running it
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const root = join(__dirname, '..', 'db');
const args = new Set(process.argv.slice(2));

export function migrationFiles(): { name: string; sql: string }[] {
  return readdirSync(join(root, 'migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(root, 'migrations', name), 'utf8') }));
}

async function main() {
  const files = migrationFiles();
  const localAuth = args.has('--local-auth');
  if (localAuth && process.env.VERCEL) throw new Error('--local-auth is for local development only');

  if (args.has('--print-sql')) {
    console.log('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now());');
    for (const f of files) console.log(`-- ${f.name}\n${f.sql}\ninsert into schema_migrations (name) values ('${f.name}') on conflict do nothing;`);
    if (localAuth) console.log(readFileSync(join(root, 'local-auth.sql'), 'utf8'));
    return;
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
    const done = new Set((await client.query<{ name: string }>('select name from schema_migrations')).rows.map((r) => r.name));
    for (const f of files) {
      if (done.has(f.name)) continue;
      await client.query('begin');
      await client.query(f.sql);
      await client.query('insert into schema_migrations (name) values ($1)', [f.name]);
      await client.query('commit');
      console.log(`applied ${f.name}`);
    }
    if (localAuth) {
      await client.query(readFileSync(join(root, 'local-auth.sql'), 'utf8'));
      console.log('applied local-auth.sql');
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

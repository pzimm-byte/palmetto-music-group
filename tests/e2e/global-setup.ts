import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import { migrationFiles } from '../../scripts/migrate';
import { seedSql } from '../../scripts/seed';
import { DB_URL, PASSWORD } from './helpers';

export default async function globalSetup() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  await db.query('drop schema if exists public cascade; create schema public; drop schema if exists neon_auth cascade;');
  for (const f of migrationFiles()) await db.query(f.sql);
  await db.query(readFileSync('db/local-auth.sql', 'utf8'));
  for (const s of await seedSql(PASSWORD, { reset: false })) await db.query(s);
  await db.end();
}

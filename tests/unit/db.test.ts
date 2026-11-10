/**
 * Schema-level checks against a real Postgres (TEST_DATABASE_URL). Skipped when it is not set.
 * Recreates the schema from db/migrations + the seed, then checks the rules the app relies on.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';
import { migrationFiles } from '../../scripts/migrate';
import { seedSql } from '../../scripts/seed';

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d('database rules', () => {
  const db = new Client({ connectionString: url });
  beforeAll(async () => {
    await db.connect();
    await db.query('drop schema if exists public cascade; create schema public; drop schema if exists neon_auth cascade;');
    for (const f of migrationFiles()) await db.query(f.sql);
    await db.query(readFileSync('db/local-auth.sql', 'utf8'));
    for (const s of await seedSql('test-password-123', { reset: false })) await db.query(s);
  });
  afterAll(() => db.end());

  it('anonymous comments have no author column value and no other identifying column', async () => {
    const cols = (await db.query("select column_name from information_schema.columns where table_name = 'comments'")).rows.map((r) => r.column_name).sort();
    expect(cols).toEqual(['author_id', 'body', 'created_at', 'id', 'parent_id', 'timestamp_seconds', 'version_id']);
    const anon = await db.query('select * from comments where author_id is null');
    expect(anon.rowCount).toBeGreaterThan(0);
  });

  it('rejects bad statuses, ratings out of range, and duplicate version numbers', async () => {
    await expect(db.query("update songs set status = 'published' where true")).rejects.toThrow();
    const v = (await db.query('select id, song_id from song_versions limit 1')).rows[0];
    const m = (await db.query('select id from members limit 1')).rows[0];
    await expect(db.query('insert into ratings (version_id, member_id, melody) values ($1, $2, 6)', [v.id, m.id])).rejects.toThrow();
    await expect(db.query('insert into song_versions (song_id, version_number, duration_seconds) values ($1, 1, 100)', [v.song_id])).rejects.toThrow();
  });

  it('one rating row per member per version; reactions are unique', async () => {
    const dup = await db.query('select version_id, member_id, count(*) from ratings group by 1, 2 having count(*) > 1');
    expect(dup.rowCount).toBe(0);
    const c = (await db.query('select comment_id, member_id from comment_reactions limit 1')).rows[0];
    await expect(db.query('insert into comment_reactions (comment_id, member_id) values ($1, $2)', [c.comment_id, c.member_id])).rejects.toThrow();
  });

  it('every seeded member has a login with a hashed password', async () => {
    const r = await db.query(`select m.email, a.password from members m join neon_auth."user" u on lower(u.email) = lower(m.email)
                                join neon_auth.account a on a."userId" = u.id and a."providerId" = 'credential'`);
    expect(r.rowCount).toBe(8);
    for (const row of r.rows) {
      expect(row.password).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
      expect(row.password).not.toContain('test-password-123');
    }
  });

  it('seeding twice without --reset is refused', async () => {
    const stmts = await seedSql('test-password-123', { reset: false });
    await expect(db.query(stmts[0])).rejects.toThrow(/already exist/);
  });
});

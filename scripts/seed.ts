/**
 * Seeds sample members, songs, versions, comments, reactions, ratings and an announcement.
 *
 *   SEED_PASSWORD=... npm run db:seed                 # refuses if songs already exist
 *   SEED_PASSWORD=... npm run db:seed -- --reset      # wipes app tables first (never touches real auth users other than the seeded ones)
 *   SEED_PASSWORD=... npm run db:seed -- --print-sql  # print SQL instead (e.g. to run through the Neon console)
 *
 * Accounts: every seeded member gets a Neon Auth (Managed Better Auth) user in neon_auth."user"
 * with a credential account whose password is SEED_PASSWORD, hashed with Better Auth's own
 * hashPassword(). That is the "admin-created account" path; there is no sign-up page.
 */
import { Client } from 'pg';
import { hashPassword } from 'better-auth/crypto';
import { buildSeed } from './seed-data';

const args = new Set(process.argv.slice(2));

export const lit = (v: string | number | boolean | null | undefined): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${v.replace(/'/g, "''")}'`;
};
const ago = (hours: number) => `now() - interval '${Math.round(hours * 60)} minutes'`;

export async function seedSql(password: string, opts: { reset: boolean }): Promise<string[]> {
  if (password.length < 8) throw new Error('SEED_PASSWORD must be at least 8 characters');
  const { members, songs, announcement } = buildSeed();
  const out: string[] = [];

  if (opts.reset) {
    out.push('truncate comment_reactions, ratings, comments, song_versions, songs, announcements, members cascade;');
  } else {
    out.push(`do $$ begin if exists (select 1 from songs) then raise exception 'songs already exist; run with --reset to replace sample data'; end if; end $$;`);
  }

  const hash = await hashPassword(password);
  for (const m of members) {
    const name = `${m.first} ${m.last}`;
    out.push(`insert into members (id, first_name, last_name, email, role, active) values (${lit(m.id)}, ${lit(m.first)}, ${lit(m.last)}, ${lit(m.email)}, ${lit(m.role)}, ${lit(m.active)});`);
    // Auth user (created if missing) + credential account with the seed password.
    out.push(`insert into neon_auth."user" (name, email, "emailVerified") select ${lit(name)}, ${lit(m.email)}, true where not exists (select 1 from neon_auth."user" where lower(email) = lower(${lit(m.email)}));`);
    out.push(`insert into neon_auth.account ("accountId", "providerId", "userId", password) select u.id::text, 'credential', u.id, ${lit(hash)} from neon_auth."user" u where lower(u.email) = lower(${lit(m.email)}) and not exists (select 1 from neon_auth.account a where a."userId" = u.id and a."providerId" = 'credential');`);
    out.push(`update neon_auth.account a set password = ${lit(hash)}, "updatedAt" = now() from neon_auth."user" u where a."userId" = u.id and a."providerId" = 'credential' and lower(u.email) = lower(${lit(m.email)});`);
  }

  for (const s of songs) {
    out.push(`insert into songs (id, writer_id, title, key, tempo, lyrics, feedback_focus, status, chord_chart_name, chord_chart_pages, created_at) values (${lit(s.id)}, ${lit(s.writer)}, ${lit(s.title)}, ${lit(s.key)}, ${lit(s.tempo)}, ${lit(s.lyrics)}, ${lit(s.focus)}, ${lit(s.status)}, ${lit(s.chart)}, ${lit(s.chartPages)}, ${ago(s.hoursAgo)});`);
    for (const v of s.versions) {
      out.push(`insert into song_versions (id, song_id, version_number, audio_key, duration_seconds, file_size, created_at) values (${lit(v.id)}, ${lit(s.id)}, ${v.n}, null, ${v.duration}, ${v.size}, ${ago(v.hoursAgo)});`);
      // parents before replies
      const ordered = [...v.comments.filter((c) => !c.parent), ...v.comments.filter((c) => c.parent)];
      for (const c of ordered) {
        out.push(`insert into comments (id, version_id, author_id, parent_id, timestamp_seconds, body, created_at) values (${lit(c.id)}, ${lit(v.id)}, ${lit(c.author)}, ${lit(c.parent ?? null)}, ${lit(c.at)}, ${lit(c.body)}, ${ago(c.hoursAgo)});`);
        for (const who of c.likes) out.push(`insert into comment_reactions (comment_id, member_id) values (${lit(c.id)}, ${lit(who)}) on conflict do nothing;`);
      }
      for (const r of v.ratings) {
        out.push(`insert into ratings (version_id, member_id, melody, lyrics, singability, theology) values (${lit(v.id)}, ${lit(r.member)}, ${r.m}, ${r.l}, ${r.s}, ${r.t});`);
      }
    }
  }

  // Next Thursday 7 PM in Greenville (America/New_York).
  out.push(`insert into announcements (author_id, title, details, body, event_at, pinned) values (${lit(announcement.author)}, ${lit(announcement.title)}, ${lit(announcement.details)}, ${lit(announcement.body)},
    ((date_trunc('week', now() at time zone 'America/New_York') + interval '3 days 19 hours'
      + case when (date_trunc('week', now() at time zone 'America/New_York') + interval '3 days 19 hours') < (now() at time zone 'America/New_York') then interval '7 days' else interval '0' end)
     at time zone 'America/New_York'), true);`);
  return out;
}

async function main() {
  const password = process.env.SEED_PASSWORD ?? '';
  const statements = await seedSql(password, { reset: args.has('--reset') });
  if (args.has('--print-sql')) {
    console.log(['begin;', ...statements, 'commit;'].join('\n'));
    return;
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('begin');
    for (const s of statements) await client.query(s);
    await client.query('commit');
    console.log(`seeded ${statements.length} statements`);
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

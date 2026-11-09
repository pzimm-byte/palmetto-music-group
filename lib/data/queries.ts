import 'server-only';
import { one, query } from '@/lib/db';
import type { SongStatus } from '@/lib/format';
import type { Member } from '@/lib/auth/session';

export type SongRow = {
  id: string;
  title: string;
  status: SongStatus;
  writer_id: string;
  writer_first: string;
  writer_last: string;
  latest_version: number;
  duration_seconds: number;
  comment_count: number;
  created_at: Date;
};

const SONG_ROW_SQL = `
  select s.id, s.title, s.status, s.writer_id, s.created_at,
         w.first_name as writer_first, w.last_name as writer_last,
         lv.version_number as latest_version, lv.duration_seconds,
         (select count(*)::int from comments c where c.version_id = lv.id) as comment_count
    from songs s
    join members w on w.id = s.writer_id
    join lateral (
      select v.id, v.version_number, v.duration_seconds from song_versions v
       where v.song_id = s.id order by v.version_number desc limit 1
    ) lv on true`;

export type Announcement = { id: string; title: string; details: string; body: string; event_at: Date | null };

export async function pinnedAnnouncement(): Promise<Announcement | null> {
  return one<Announcement>(
    'select id, title, details, body, event_at from announcements where pinned order by created_at desc limit 1',
  );
}

export async function songsNeedingFeedback(member: Member, limit = 5): Promise<SongRow[]> {
  return query<SongRow>(
    `${SONG_ROW_SQL} where s.status = 'in_review' and s.writer_id <> $1 order by s.created_at desc limit $2`,
    [member.id, limit],
  );
}

export type Activity = {
  kind: 'comment' | 'upload';
  at: Date;
  song_id: string;
  song_title: string;
  actor_id: string | null;
  actor_first: string | null;
  actor_last: string | null;
  timestamp_seconds: number | null;
  version_number: number;
};

export async function recentActivity(limit = 6): Promise<Activity[]> {
  return query<Activity>(
    `select * from (
       select 'comment' as kind, c.created_at as at, s.id as song_id, s.title as song_title,
              c.author_id as actor_id, m.first_name as actor_first, m.last_name as actor_last,
              c.timestamp_seconds, v.version_number
         from comments c
         join song_versions v on v.id = c.version_id
         join songs s on s.id = v.song_id
         left join members m on m.id = c.author_id
        where c.parent_id is null and s.status <> 'draft'
       union all
       select 'upload', v.created_at, s.id, s.title, s.writer_id, m.first_name, m.last_name, null, v.version_number
         from song_versions v
         join songs s on s.id = v.song_id
         join members m on m.id = s.writer_id
        where s.status <> 'draft'
     ) a order by at desc limit $1`,
    [limit],
  );
}

export type LibraryFilter = { q?: string; status?: SongStatus; writer?: string };

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => '\\' + c);
}

export async function librarySongs(f: LibraryFilter): Promise<SongRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.q) {
    params.push(`%${escapeLike(f.q)}%`);
    const p = `$${params.length}`;
    where.push(`(s.title ilike ${p} or s.lyrics ilike ${p} or (w.first_name || ' ' || w.last_name) ilike ${p})`);
  }
  if (f.status) {
    params.push(f.status);
    where.push(`s.status = $${params.length}`);
  }
  if (f.writer && /^[0-9a-f-]{36}$/i.test(f.writer)) {
    params.push(f.writer);
    where.push(`s.writer_id = $${params.length}`);
  }
  return query<SongRow>(
    `${SONG_ROW_SQL} ${where.length ? 'where ' + where.join(' and ') : ''} order by s.created_at desc`,
    params,
  );
}

export function countByStatus(rows: { status: SongStatus }[]): Record<SongStatus | 'all', number> {
  const out = { all: rows.length, in_review: 0, review_complete: 0, draft: 0, archived: 0 };
  for (const r of rows) out[r.status]++;
  return out;
}

export async function writers(): Promise<{ id: string; first_name: string; last_name: string }[]> {
  return query(
    `select distinct m.id, m.first_name, m.last_name from members m join songs s on s.writer_id = m.id order by m.first_name, m.last_name`,
  );
}

export type SongDetail = {
  id: string;
  title: string;
  key: string | null;
  tempo: number | null;
  lyrics: string;
  feedback_focus: string;
  status: SongStatus;
  chord_chart_name: string | null;
  chord_chart_pages: number | null;
  created_at: Date;
  writer_id: string;
  writer_first: string;
  writer_last: string;
};

export type Version = { id: string; version_number: number; duration_seconds: number; created_at: Date; notes: string };

export type CommentNode = {
  id: string;
  parent_id: string | null;
  author_id: string | null;
  author_first: string | null;
  author_last: string | null;
  timestamp_seconds: number | null;
  body: string;
  created_at: Date;
  likes: number;
  liked: boolean;
  is_writer: boolean;
  replies: CommentNode[];
};

export type Ratings = { melody: number | null; lyrics: number | null; singability: number | null; theology: number | null };

export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function songDetail(id: string): Promise<SongDetail | null> {
  if (!isUuid(id)) return null;
  return one<SongDetail>(
    `select s.*, w.first_name as writer_first, w.last_name as writer_last
       from songs s join members w on w.id = s.writer_id where s.id = $1`,
    [id],
  );
}

export async function songVersions(songId: string): Promise<Version[]> {
  return query<Version>(
    'select id, version_number, duration_seconds, created_at, notes from song_versions where song_id = $1 order by version_number asc',
    [songId],
  );
}

/** Builds the reply tree. Top-level feedback newest first; replies oldest first under each. */
export function buildCommentTree(rows: Omit<CommentNode, 'replies' | 'is_writer'>[], writerId: string): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  for (const r of rows) byId.set(r.id, { ...r, is_writer: r.author_id === writerId, replies: [] });
  const top: CommentNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : null;
    if (parent) parent.replies.push(node);
    else top.push(node);
  }
  const ts = (n: CommentNode) => new Date(n.created_at).getTime();
  top.sort((a, b) => ts(b) - ts(a));
  for (const n of byId.values()) n.replies.sort((a, b) => ts(a) - ts(b));
  return top;
}

export async function versionComments(versionId: string, writerId: string, viewerId: string): Promise<CommentNode[]> {
  const rows = await query<Omit<CommentNode, 'replies' | 'is_writer'>>(
    `select c.id, c.parent_id, c.author_id, m.first_name as author_first, m.last_name as author_last,
            c.timestamp_seconds, c.body, c.created_at,
            (select count(*)::int from comment_reactions r where r.comment_id = c.id) as likes,
            exists(select 1 from comment_reactions r where r.comment_id = c.id and r.member_id = $2) as liked
       from comments c left join members m on m.id = c.author_id
      where c.version_id = $1
      order by c.created_at asc`,
    [versionId, viewerId],
  );
  return buildCommentTree(rows, writerId);
}

export async function myRatings(versionId: string, memberId: string): Promise<Ratings> {
  return (
    (await one<Ratings>('select melody, lyrics, singability, theology from ratings where version_id = $1 and member_id = $2', [
      versionId,
      memberId,
    ])) ?? { melody: null, lyrics: null, singability: null, theology: null }
  );
}

export async function averageRatings(versionId: string): Promise<Ratings & { count: number }> {
  const r = await one<Ratings & { count: number }>(
    `select round(avg(melody)::numeric, 1)::float as melody, round(avg(lyrics)::numeric, 1)::float as lyrics,
            round(avg(singability)::numeric, 1)::float as singability, round(avg(theology)::numeric, 1)::float as theology,
            count(*)::int as count
       from ratings where version_id = $1`,
    [versionId],
  );
  return r ?? { melody: null, lyrics: null, singability: null, theology: null, count: 0 };
}

export async function newCommentsThisWeek(versionId: string, writerId: string): Promise<number> {
  const r = await one<{ n: number }>(
    `select count(*)::int as n from comments
      where version_id = $1 and created_at > now() - interval '7 days' and author_id is distinct from $2`,
    [versionId, writerId],
  );
  return r?.n ?? 0;
}

export async function songOptionsForMember(memberId: string): Promise<{ id: string; title: string; latest: number }[]> {
  return query(
    `select s.id, s.title, max(v.version_number)::int as latest from songs s join song_versions v on v.song_id = s.id
      where s.writer_id = $1 group by s.id, s.title order by s.title`,
    [memberId],
  );
}

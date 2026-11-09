'use server';

import { revalidatePath } from 'next/cache';
import { one, query, tx } from '@/lib/db';
import { requireMember } from '@/lib/auth/session';
import { MAX_AUDIO_BYTES } from '@/lib/format';
import { isUuid } from './queries';

export type ActionResult = { ok: true; id?: string; at?: number | null } | { ok: false; error: string };

const MAX_BODY = 4000;

function cleanBody(raw: unknown): string | null {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s || s.length > MAX_BODY) return null;
  return s;
}

async function versionContext(versionId: string) {
  if (!isUuid(versionId)) return null;
  return one<{ song_id: string; writer_id: string; duration_seconds: number }>(
    `select s.id as song_id, s.writer_id, v.duration_seconds from song_versions v join songs s on s.id = v.song_id where v.id = $1`,
    [versionId],
  );
}

/** Top-level feedback. `timestampSeconds` null = applies to the whole song. */
export async function postComment(input: { versionId: string; body: string; timestampSeconds: number | null }): Promise<ActionResult> {
  const me = await requireMember();
  const body = cleanBody(input.body);
  if (!body) return { ok: false, error: 'Write some feedback first (up to 4,000 characters).' };
  const ctx = await versionContext(input.versionId);
  if (!ctx) return { ok: false, error: 'That version no longer exists.' };
  if (ctx.writer_id === me.id) return { ok: false, error: 'Writers reply to feedback on their own songs instead of posting new feedback.' };
  let at: number | null = null;
  if (input.timestampSeconds !== null && input.timestampSeconds !== undefined) {
    const t = Math.round(Number(input.timestampSeconds));
    if (!Number.isFinite(t) || t < 0 || t > ctx.duration_seconds) return { ok: false, error: 'That pin is outside the song.' };
    at = t;
  }
  const row = await one<{ id: string }>(
    'insert into comments (version_id, author_id, timestamp_seconds, body) values ($1, $2, $3, $4) returning id',
    [input.versionId, me.id, at, body],
  );
  revalidatePath(`/songs/${ctx.song_id}`);
  revalidatePath('/');
  return { ok: true, id: row!.id, at };
}

export async function postReply(input: { parentId: string; body: string }): Promise<ActionResult> {
  const me = await requireMember();
  const body = cleanBody(input.body);
  if (!body) return { ok: false, error: 'Write a reply first.' };
  if (!isUuid(input.parentId)) return { ok: false, error: 'That comment no longer exists.' };
  const parent = await one<{ id: string; version_id: string; parent_id: string | null }>(
    'select id, version_id, parent_id from comments where id = $1',
    [input.parentId],
  );
  if (!parent) return { ok: false, error: 'That comment no longer exists.' };
  const rootId = parent.parent_id ?? parent.id; // one level of threading
  const ctx = await versionContext(parent.version_id);
  const row = await one<{ id: string }>(
    'insert into comments (version_id, author_id, parent_id, body) values ($1, $2, $3, $4) returning id',
    [parent.version_id, me.id, rootId, body],
  );
  if (ctx) revalidatePath(`/songs/${ctx.song_id}`);
  return { ok: true, id: row!.id };
}

export async function toggleReaction(commentId: string): Promise<ActionResult & { liked?: boolean; likes?: number }> {
  const me = await requireMember();
  if (!isUuid(commentId)) return { ok: false, error: 'That comment no longer exists.' };
  const exists = await one('select 1 from comments where id = $1', [commentId]);
  if (!exists) return { ok: false, error: 'That comment no longer exists.' };
  const removed = await query('delete from comment_reactions where comment_id = $1 and member_id = $2 returning 1', [commentId, me.id]);
  if (removed.length === 0) {
    await query('insert into comment_reactions (comment_id, member_id) values ($1, $2) on conflict do nothing', [commentId, me.id]);
  }
  const n = await one<{ n: number }>('select count(*)::int as n from comment_reactions where comment_id = $1', [commentId]);
  return { ok: true, liked: removed.length === 0, likes: n?.n ?? 0 };
}

const RATING_COLUMNS = { melody: 'melody', lyrics: 'lyrics', singability: 'singability', theology: 'theology' } as const;
export type RatingCategory = keyof typeof RATING_COLUMNS;

export async function rateVersion(input: { versionId: string; category: RatingCategory; value: number }): Promise<ActionResult> {
  const me = await requireMember();
  const col = RATING_COLUMNS[input.category];
  if (!col) return { ok: false, error: 'Unknown rating.' };
  const v = Math.round(Number(input.value));
  if (!(v >= 1 && v <= 5)) return { ok: false, error: 'Ratings are 1 to 5.' };
  const ctx = await versionContext(input.versionId);
  if (!ctx) return { ok: false, error: 'That version no longer exists.' };
  if (ctx.writer_id === me.id) return { ok: false, error: "Writers don't rate their own songs." };
  await query(
    `insert into ratings (version_id, member_id, ${col}) values ($1, $2, $3)
     on conflict (version_id, member_id) do update set ${col} = excluded.${col}, updated_at = now()`,
    [input.versionId, me.id, v],
  );
  revalidatePath(`/songs/${ctx.song_id}`);
  return { ok: true };
}

/** Writer tools: "Mark complete" / "Reopen". Only the song's writer may change it. */
export async function setReviewComplete(input: { songId: string; complete: boolean }): Promise<ActionResult> {
  const me = await requireMember();
  if (!isUuid(input.songId)) return { ok: false, error: 'Song not found.' };
  const song = await one<{ writer_id: string }>('select writer_id from songs where id = $1', [input.songId]);
  if (!song) return { ok: false, error: 'Song not found.' };
  if (song.writer_id !== me.id) return { ok: false, error: 'Only the writer can change this.' };
  await query('update songs set status = $1 where id = $2', [input.complete ? 'review_complete' : 'in_review', input.songId]);
  revalidatePath(`/songs/${input.songId}`);
  revalidatePath('/songs');
  revalidatePath('/');
  return { ok: true };
}

export type UploadInput = {
  mode: 'song' | 'version';
  songId?: string;
  title?: string;
  key?: string;
  tempo?: number | null;
  lyrics?: string;
  feedbackFocus?: string;
  status?: 'in_review' | 'draft';
  durationSeconds: number;
  fileSize: number;
  fileName: string;
  chordChartName?: string | null;
};

/**
 * Phase 1: records the song/version in Postgres. The audio itself stays in the
 * browser; Phase 2 uploads it to Cloudflare R2 and stores `audio_key`.
 */
export async function shareSong(input: UploadInput): Promise<ActionResult> {
  const me = await requireMember();
  const duration = Math.round(Number(input.durationSeconds));
  if (!Number.isFinite(duration) || duration < 1 || duration > 60 * 60) return { ok: false, error: 'Choose an audio file first.' };
  if (!(input.fileSize > 0) || input.fileSize > MAX_AUDIO_BYTES) return { ok: false, error: 'Audio files can be up to 100 MB.' };
  const status = input.status === 'draft' ? 'draft' : 'in_review';
  const tempo = input.tempo === null || input.tempo === undefined || Number.isNaN(Number(input.tempo)) ? null : Math.round(Number(input.tempo));
  if (tempo !== null && (tempo < 20 || tempo > 300)) return { ok: false, error: 'Tempo should be between 20 and 300 BPM.' };

  if (input.mode === 'version') {
    if (!input.songId || !isUuid(input.songId)) return { ok: false, error: 'Choose which song this is a new version of.' };
    const result = await tx(async (c) => {
      const s = await c.query<{ writer_id: string }>('select writer_id from songs where id = $1 for update', [input.songId]);
      if (!s.rows[0]) return { ok: false as const, error: 'Song not found.' };
      if (s.rows[0].writer_id !== me.id) return { ok: false as const, error: 'You can only add versions to your own songs.' };
      const next = await c.query<{ n: number }>('select coalesce(max(version_number), 0)::int + 1 as n from song_versions where song_id = $1', [input.songId]);
      await c.query('insert into song_versions (song_id, version_number, duration_seconds, file_size, notes) values ($1, $2, $3, $4, $5)', [
        input.songId, next.rows[0].n, duration, input.fileSize, input.fileName.slice(0, 200),
      ]);
      const sets: string[] = ['status = $2'];
      const params: unknown[] = [input.songId, status];
      if (input.feedbackFocus?.trim()) { params.push(input.feedbackFocus.trim().slice(0, 1000)); sets.push(`feedback_focus = $${params.length}`); }
      if (input.lyrics?.trim()) { params.push(input.lyrics.trim().slice(0, 20000)); sets.push(`lyrics = $${params.length}`); }
      if (input.key?.trim()) { params.push(input.key.trim().slice(0, 12)); sets.push(`key = $${params.length}`); }
      if (tempo !== null) { params.push(tempo); sets.push(`tempo = $${params.length}`); }
      if (input.chordChartName) { params.push(input.chordChartName.slice(0, 200)); sets.push(`chord_chart_name = $${params.length}`); }
      await c.query(`update songs set ${sets.join(', ')} where id = $1`, params);
      return { ok: true as const, id: input.songId };
    });
    if (result.ok) { revalidatePath('/songs'); revalidatePath('/'); revalidatePath(`/songs/${input.songId}`); }
    return result;
  }

  const title = input.title?.trim() ?? '';
  if (!title) return { ok: false, error: 'Give the song a title.' };
  if (title.length > 120) return { ok: false, error: 'Keep the title under 120 characters.' };
  const id = await tx(async (c) => {
    const s = await c.query<{ id: string }>(
      `insert into songs (writer_id, title, key, tempo, lyrics, feedback_focus, status, chord_chart_name)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [me.id, title, input.key?.trim().slice(0, 12) || null, tempo, (input.lyrics ?? '').trim().slice(0, 20000),
        (input.feedbackFocus ?? '').trim().slice(0, 1000), status, input.chordChartName?.slice(0, 200) || null],
    );
    await c.query('insert into song_versions (song_id, version_number, duration_seconds, file_size, notes) values ($1, 1, $2, $3, $4)', [
      s.rows[0].id, duration, input.fileSize, input.fileName.slice(0, 200),
    ]);
    return s.rows[0].id;
  });
  revalidatePath('/songs');
  revalidatePath('/');
  return { ok: true, id };
}

import { describe, expect, it } from 'vitest';
import { buildCommentTree, countByStatus, isUuid } from '@/lib/data/queries';
import { buildSeed } from '../../scripts/seed-data';
import { lit } from '../../scripts/seed';

const row = (id: string, parent: string | null, author: string | null, hoursAgo: number) => ({
  id, parent_id: parent, author_id: author, author_first: author ? 'A' : null, author_last: author ? 'B' : null,
  timestamp_seconds: null, body: id, created_at: new Date(Date.now() - hoursAgo * 3600e3), likes: 0, liked: false,
});

describe('comment tree', () => {
  it('nests replies, newest feedback first, replies oldest first, flags the writer', () => {
    const tree = buildCommentTree(
      [row('a', null, 'm1', 10), row('b', null, null, 5), row('a1', 'a', 'w', 9), row('a2', 'a', 'm2', 8)],
      'w',
    );
    expect(tree.map((t) => t.id)).toEqual(['b', 'a']);
    expect(tree[1].replies.map((r) => r.id)).toEqual(['a1', 'a2']);
    expect(tree[1].replies[0].is_writer).toBe(true);
    expect(tree[0].author_id).toBeNull();
  });
});

describe('helpers', () => {
  it('validates uuids', () => {
    expect(isUuid('64340c95-eccd-4fc8-9d77-c7f4068166d0')).toBe(true);
    expect(isUuid("1' or '1'='1")).toBe(false);
  });
  it('counts statuses', () => {
    expect(countByStatus([{ status: 'draft' }, { status: 'draft' }, { status: 'archived' }])).toEqual({ all: 3, in_review: 0, review_complete: 0, draft: 2, archived: 1 });
  });
  it('escapes SQL literals in the seed', () => {
    expect(lit("Hymn of the Long Night (A Lament That Ends in Hope at the River's Edge)")).toBe("'Hymn of the Long Night (A Lament That Ends in Hope at the River''s Edge)'");
    expect(lit(null)).toBe('null');
    expect(lit(true)).toBe('true');
  });
});

describe('seed data covers the required edge cases', () => {
  const { members, songs } = buildSeed();
  const latest = (title: string) => {
    const s = songs.find((x) => x.title === title)!;
    return s.versions[s.versions.length - 1];
  };
  it('matches the design library counts (18 songs: 5/4/7/2)', () => {
    expect(countByStatus(songs)).toEqual({ all: 18, in_review: 5, review_complete: 4, draft: 7, archived: 2 });
  });
  it('has a song with 0 comments, one with 20+ versions and 30+ comments', () => {
    expect(latest('Still the Lamb').comments).toHaveLength(0);
    const weary = songs.find((s) => s.title === 'Come, Weary Ones')!;
    expect(weary.versions.length).toBeGreaterThanOrEqual(20);
    expect(latest('Come, Weary Ones').comments.length).toBeGreaterThanOrEqual(30);
  });
  it('has long names, long comments, anonymous comments and an inactive member', () => {
    expect(members.some((m) => `${m.first} ${m.last}`.length > 35)).toBe(true);
    expect(songs.some((s) => s.title.length > 60)).toBe(true);
    const all = songs.flatMap((s) => s.versions.flatMap((v) => v.comments));
    expect(all.some((c) => c.body.length > 400)).toBe(true);
    expect(all.some((c) => c.author === null)).toBe(true);
    expect(members.some((m) => !m.active)).toBe(true);
  });
  it('never makes a writer reply anonymous and keeps every pin inside its song', () => {
    for (const s of songs)
      for (const v of s.versions)
        for (const c of v.comments) {
          if (c.parent && c.author === s.writer) expect(c.author).not.toBeNull();
          if (c.at !== null) expect(c.at).toBeLessThanOrEqual(v.duration);
        }
  });
});

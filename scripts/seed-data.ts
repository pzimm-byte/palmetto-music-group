/**
 * Sample data for Phase 1. Every name and song here is fictional sample content.
 * Times are expressed as "hours ago" so relative labels stay meaningful whenever it is seeded.
 *
 * Edge cases covered on purpose (see CLAUDE.md):
 *   - Still the Lamb v3: a song version with 0 comments
 *   - Come, Weary Ones: 22 versions and 34 comments on the latest version
 *   - Jonathan Alexander Montgomery-Whitfield + a very long title and long comments
 *   - Emily Grace: an inactive member who has a login but must not get in
 *   - Anonymous comments (author_id NULL)
 */
import { randomUUID } from 'node:crypto';
import type { SongStatus } from '../lib/format';

export type SeedMember = { id: string; first: string; last: string; email: string; role: 'admin' | 'member'; active: boolean };
export type SeedComment = { id: string; author: string | null; at: number | null; body: string; hoursAgo: number; parent?: string; likes: string[] };
export type SeedVersion = { id: string; n: number; duration: number; hoursAgo: number; size: number; comments: SeedComment[]; ratings: { member: string; m: number; l: number; s: number; t: number }[] };
export type SeedSong = {
  id: string; writer: string; title: string; key: string; tempo: number; status: SongStatus; hoursAgo: number;
  lyrics: string; focus: string; chart: string | null; chartPages: number | null; versions: SeedVersion[];
};

const DOMAIN = 'pbc-songwriters.test';
const mk = (first: string, last: string, role: 'admin' | 'member' = 'member', active = true, local?: string): SeedMember => ({
  id: randomUUID(), first, last, role, active,
  email: `${local ?? `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '')}@${DOMAIN}`,
});

export function buildSeed() {
  const paul = mk('Paul', 'Zimmerman', 'admin', true, 'paul');
  const sarah = mk('Sarah', 'Mitchell');
  const david = mk('David', 'Harper');
  const rachel = mk('Rachel', 'Lin');
  const marcus = mk('Marcus', 'Bell');
  const hannah = mk('Hannah', 'Okafor');
  const jonathan = mk('Jonathan Alexander', 'Montgomery-Whitfield', 'member', true, 'jonathan');
  const emily = mk('Emily', 'Grace', 'member', false);
  const members = [paul, sarah, david, rachel, marcus, hannah, jonathan, emily];
  const listeners = [paul, sarah, david, rachel, marcus, hannah, jonathan];

  const c = (author: SeedMember | null, at: number | null, body: string, hoursAgo: number, likes: SeedMember[] = []): SeedComment => ({
    id: randomUUID(), author: author?.id ?? null, at, body, hoursAgo, likes: likes.map((m) => m.id),
  });
  const reply = (parent: SeedComment, author: SeedMember, body: string, hoursAgo: number): SeedComment => ({
    ...c(author, null, body, hoursAgo), parent: parent.id,
  });
  const v = (n: number, duration: number, hoursAgo: number, comments: SeedComment[] = [], ratings: SeedVersion['ratings'] = []): SeedVersion => ({
    id: randomUUID(), n, duration, hoursAgo, size: Math.round(duration * 0.128 * 1024 * 1024 / 8 * 1.02), comments, ratings,
  });
  const song = (s: Omit<SeedSong, 'id'>): SeedSong => ({ id: randomUUID(), ...s });

  const BANK = [
    'The melody in the chorus sits really well. Easy to pick up on a second listen.',
    'Could the pre-chorus build a little more? It lands a bit flat going into the hook.',
    'This line about the cross is strong. I would keep it exactly as it is.',
    'The verse range dips quite low for a congregation. Maybe up a step?',
    'Love the turn to the minor chord here. It gives the lament real weight.',
    'Second verse feels wordy. Could two lines be combined?',
    'The bridge lyric is beautiful but the rhythm is tricky to sing together.',
    'Great tempo for a Sunday opener.',
    'Theologically this is so clear. Grace before effort, all the way through.',
    'I lost the thread of the story in verse three. What is the main image?',
    'The final chorus would be powerful a cappella.',
    'This melody leap might be hard for kids to sing. Worth testing with the youth choir.',
  ];

  // ---------------- Grace Upon Grace (Sarah) — the design's main example ----------------
  const gugV1c = [
    c(rachel, 217, 'The ending feels abrupt. Could the last chorus repeat once more, softer?', 24 * 23),
    c(david, 45, 'Verse 1 melody is lovely. Maybe hold "name" a beat longer.', 24 * 22),
    c(null, 130, 'Chorus is catchy but the third line has too many words for the tune.', 24 * 22),
    c(hannah, null, 'Overall a really promising start. Excited to hear where this goes.', 24 * 21),
  ];
  const david142 = c(david, 102, 'The bridge drags here. Try holding the IV chord for two bars instead of four, then lift straight into the chorus.', 50, [rachel, paul, marcus, hannah]);
  const anon58 = c(null, 58, 'Verse 2 has a lot of syllables packed into the third line. Hard to sing on a first try.', 26, [david, rachel, paul, marcus, hannah, jonathan]);
  const rachel244 = c(rachel, 164, 'Love the image of grace as a river here. This line is the heart of the song.', 20, [david, paul, hannah]);
  const gugV2c = [
    david142, reply(david142, sarah, "Good call. I'll try that in v3.", 46),
    anon58, rachel244,
    c(paul, 12, 'The intro is a perfect length. It sets the mood without wandering.', 70, [sarah]),
    c(marcus, 75, 'Verse 2 melody echoes verse 1 nicely. Very singable.', 66),
    c(hannah, 190, 'Final chorus key change? It could lift the room.', 60, [marcus]),
    c(jonathan, null, 'Whole-song thought: this would fit well after the sermon on Ephesians 2.', 40),
    c(paul, 230, 'The outro could end on the tonic instead of the IV. It sounds unresolved right now.', 30),
    c(marcus, 140, 'Love the rhythm of "more than I\'m knowing".', 6),
  ];
  gugV2c.push(reply(gugV2c[4], sarah, 'Thanks Paul!', 68));
  gugV2c.push(reply(anon58, david, 'Agree. Could split it across two bars.', 22));
  const grace = song({
    writer: sarah.id, title: 'Grace Upon Grace', key: 'G', tempo: 72, status: 'in_review', hoursAgo: 72,
    lyrics: 'VERSE 1\nWhen I was far, You called my name\nAnd met me in my weariness and shame\n\nCHORUS\nGrace upon grace, like a river flowing\nMercy that keeps on coming home\nGrace upon grace, more than I\'m knowing\nI am Yours and not alone\n\nVERSE 2\nNo debt too deep, no road too long\nYour kindness turns my mourning into song\n\nBRIDGE\nFrom the fullness of Your heart\nEvery blessing, every part',
    focus: 'Does the bridge lift enough before the last chorus? Is verse 2 too wordy for a congregation to sing?',
    chart: 'grace-upon-grace-chart.pdf', chartPages: 2,
    versions: [
      v(1, 241, 24 * 25, gugV1c, [{ member: david.id, m: 4, l: 3, s: 4, t: 5 }, { member: rachel.id, m: 3, l: 3, s: 4, t: 4 }]),
      v(2, 258, 72, gugV2c, [
        { member: paul.id, m: 4, l: 4, s: 5, t: 5 }, { member: david.id, m: 5, l: 4, s: 4, t: 5 },
        { member: rachel.id, m: 4, l: 3, s: 5, t: 5 }, { member: marcus.id, m: 4, l: 4, s: 4, t: 4 },
        { member: hannah.id, m: 4, l: 4, s: 5, t: 5 },
      ]),
    ],
  });

  // ---------------- Come, Weary Ones (Paul): 22 versions, 34 comments ----------------
  const cwoVersions: SeedVersion[] = [];
  for (let n = 1; n <= 22; n++) cwoVersions.push(v(n, 270 + (n % 5) * 4, 24 * (120 - n * 5)));
  const latestCwo = cwoVersions[21];
  for (let i = 0; i < 34; i++) {
    const who = i % 9 === 4 ? null : listeners.filter((m) => m.id !== paul.id)[i % 6];
    latestCwo.comments.push(c(who, i % 7 === 3 ? null : (i * 37) % latestCwo.duration, BANK[i % BANK.length], 24 * 8 - i * 4, listeners.slice(0, i % 4)));
  }
  latestCwo.comments.push(reply(latestCwo.comments[33], paul, 'Thank you all. Marking this one complete for now.', 24 * 1));
  latestCwo.ratings = listeners.filter((m) => m.id !== paul.id).map((m, i) => ({ member: m.id, m: 4 + (i % 2), l: 4, s: 5, t: 5 - (i % 2) }));
  const weary = song({
    writer: paul.id, title: 'Come, Weary Ones', key: 'D', tempo: 68, status: 'review_complete', hoursAgo: 96,
    lyrics: 'VERSE 1\nCome, weary ones, lay your burdens down\nThe Shepherd calls, His mercy all around\n\nCHORUS\nRest, rest, in the arms of the Lord\nRest, rest, you are His and restored',
    focus: 'Is the final chorus arrangement ready for Sunday?', chart: 'come-weary-ones-chart.pdf', chartPages: 3, versions: cwoVersions,
  });

  // ---------------- Hymn with a very long title (Jonathan) ----------------
  const longC = c(hannah, 66,
    'I have listened to this four or five times now and I keep coming back to the second verse. The way the melody climbs on "though the night is long and the watchmen weary" is gorgeous, but I wonder whether the congregation will be able to follow the rhythm there, because the syllables do not land on the strong beats the way they do in the first verse. One option might be to drop "and the" so it reads "though the night is long, the watchmen weary", which keeps the meaning and gives everyone a breath. Either way, thank you for writing something this honest about lament.',
    15, [paul, rachel]);
  const hymn = song({
    writer: jonathan.id, title: "Hymn of the Long Night (A Lament That Ends in Hope at the River's Edge)", key: 'Em', tempo: 64, status: 'in_review', hoursAgo: 30,
    lyrics: 'VERSE 1\nHow long, O Lord, the night is deep\nOur eyes are weary, yet we cannot sleep\n\nVERSE 2\nThough the night is long and the watchmen weary\nYour faithfulness is our song',
    focus: 'This is my first attempt at a lament for this month\'s prompt. Does the turn to hope in the last verse feel earned, or too sudden? Also, is the melody in verse two too high for most people?',
    chart: null, chartPages: null,
    versions: [v(1, 312, 30, [longC, reply(longC, jonathan, 'Thank you Hannah. That edit is perfect and I will use it in the next version.', 10)], [{ member: hannah.id, m: 4, l: 5, s: 3, t: 5 }])],
  });

  const morning = song({
    writer: david.id, title: 'Morning Mercies', key: 'A', tempo: 84, status: 'in_review', hoursAgo: 60,
    lyrics: 'VERSE 1\nYour mercies new with every dawn\nYour faithfulness goes on and on',
    focus: 'Is the tempo too quick for an opener?', chart: null, chartPages: null,
    versions: [v(1, 306, 60, [
      c(sarah, 32, 'Tempo feels right to me. Bright but not rushed.', 40, [rachel]),
      c(rachel, 150, 'The chorus melody is so memorable.', 30),
      c(null, null, 'Maybe add a short instrumental break before the last chorus?', 18),
    ])],
  });

  const lamb = song({
    writer: rachel.id, title: 'Still the Lamb', key: 'C', tempo: 70, status: 'in_review', hoursAgo: 4,
    lyrics: 'VERSE 1\nOn the throne and on the tree\nStill the Lamb who died for me',
    focus: 'Brand new v3 with a rewritten bridge. First impressions?', chart: 'still-the-lamb-chart.pdf', chartPages: 1,
    versions: [
      v(1, 220, 24 * 30, [c(david, 40, 'Beautiful concept.', 24 * 29)]),
      v(2, 228, 24 * 9, [c(sarah, 120, 'The new bridge chords are lovely.', 24 * 8)]),
      v(3, 232, 4, []), // edge case: 0 comments
    ],
  });

  const every = song({
    writer: paul.id, title: 'Every Promise', key: 'E', tempo: 76, status: 'in_review', hoursAgo: 48,
    lyrics: 'VERSE 1\nEvery promise You have spoken\nStands forever, never broken',
    focus: 'Does the chorus need a stronger hook?', chart: null, chartPages: null,
    versions: [v(1, 245, 48, [
      c(sarah, 88, 'The hook is there, just bring the melody up a third on "never".', 36, [david]),
      c(marcus, null, 'Love the scripture references through the whole song.', 20),
    ])],
  });

  const simple = (writer: SeedMember, title: string, key: string, tempo: number, status: SongStatus, hoursAgo: number, versions: number, comments: number) =>
    song({
      writer: writer.id, title, key, tempo, status, hoursAgo,
      lyrics: `VERSE 1\n${title}, a song in progress\n(sample lyrics)`, focus: status === 'draft' ? '' : 'General thoughts welcome.',
      chart: null, chartPages: null,
      versions: Array.from({ length: versions }, (_, i) =>
        v(i + 1, 200 + ((title.length * 7) % 90), hoursAgo + (versions - 1 - i) * 24 * 6,
          i === versions - 1 ? Array.from({ length: comments }, (_, k) => c(listeners.filter((m) => m.id !== writer.id)[k % 6], (k * 41) % 200, BANK[(k + title.length) % BANK.length], hoursAgo - 2 - k)) : []),
      ),
    });

  const songs = [
    lamb, hymn, every, morning, grace, weary,
    simple(sarah, 'Psalm 46 (River)', 'F', 66, 'draft', 120, 1, 1),
    simple(rachel, 'Table of Welcome', 'Bb', 78, 'review_complete', 24 * 7, 2, 9),
    simple(david, 'Hosanna Road', 'G', 92, 'archived', 24 * 40, 1, 5),
    simple(marcus, 'Bread for the Journey', 'D', 74, 'review_complete', 24 * 10, 3, 6),
    simple(hannah, 'Steadfast', 'C', 70, 'review_complete', 24 * 12, 2, 4),
    simple(david, 'Lantern Song', 'A', 80, 'draft', 24 * 3, 1, 0),
    simple(marcus, 'Benediction in G', 'G', 60, 'draft', 24 * 5, 1, 0),
    simple(hannah, 'Hallowed Ground', 'Eb', 72, 'draft', 24 * 6, 2, 0),
    simple(paul, 'Untitled Advent Idea', 'D', 66, 'draft', 24 * 2, 1, 0),
    simple(rachel, 'Wake, O Sleeper', 'E', 96, 'draft', 24 * 8, 1, 0),
    simple(jonathan, 'Shepherd of the Night Watch', 'Am', 62, 'draft', 24 * 9, 1, 0),
    simple(sarah, 'Old Paths', 'G', 76, 'archived', 24 * 60, 2, 3),
  ];

  const announcement = {
    title: 'Writing night',
    details: 'Choir room · bring one song in progress',
    body: "This month's prompt: a hymn of lament that ends in hope.",
    author: paul.id,
  };

  return { members, songs, announcement };
}

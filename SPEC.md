# PBC Songwriters — Build Spec

A private, invite-only, mobile-first web app where Palmetto Baptist Church's songwriting group uploads songs, listens, and leaves timestamped feedback. Product owner and approver: Paul Zimmerman.

- Design canvas (visual source of truth): https://claude.ai/artifact/EZtVKtVy31xpSdufX7BC71
- Build plan: https://claude.ai/artifact/AdNd2y7R3mhPLAyqDxyep4
- Brand reference: https://www.pbcgreenville.org/ (Poppins, Palmetto green, pill buttons)

Paul creates every account. There is no public sign-up.

---

## Phase 1 — scope

Deliver a working app shell with real sign-in, real database tables, and the designed screens running on seeded sample data. Real audio upload (Cloudflare R2) is Phase 2.

**In scope**

- Next.js (App Router) + TypeScript, deployed to a Vercel preview.
- Neon Postgres tables (see Data model) plus a seed script with sample songs, versions, comments, ratings and members.
- Sign-in with admin-created accounts only (Neon Auth): email + password, forgot-password flow, no sign-up page.
- Screens: Home, Song library, Song page (member view and writer view), Upload song. Light and dark mode following the device setting.
- Song page interactions against seeded data: play/pause with a moving playhead, skip ±10 s, tap a timestamp or waveform dot to jump, version switching, drag-to-pin, posting a comment, replies, thumbs-up, ratings, Lyrics and Chord chart tabs.

**Out of scope for Phase 1:** real file upload/storage, Announcements, Discussion, Profile and Admin screens, notifications.

**Acceptance criteria**

- [ ] Only seeded accounts can sign in; signed-out visitors are sent to Sign in
- [ ] Every screen matches the design at 390 px phone width and works at 1280 px laptop width
- [ ] Dark mode follows the device setting and uses the dark tokens below
- [ ] A posted comment is saved with the member's name, its pinned time (or none) and its version
- [ ] Writers see writer tools on their own songs only
- [ ] All touch targets ≥ 44 px; text meets 4.5:1 contrast in both modes

---

## Screens and behavior

Every screen is mobile-first (390 px design width) with a floating frosted-glass pill tab bar at the bottom: Home, Songs, a round green upload (+) button, Discuss, Profile. The active tab sits in a light-green pill.

### Home

- Header: "PALMETTO BAPTIST CHURCH" small-caps label in green, "Songwriters" title, "Good morning, [first name]", notification bell.
- Pinned announcement: white card with outline. Green date tile on the left ("THU / 7 PM"), title and one line of detail on the right, the prompt below, and a "See all announcements →" text link on the right.
- "NEEDS YOUR FEEDBACK": songs in review — icon tile, title, writer · version · comment count, "In review" tag.
- "RECENT ACTIVITY": comments and uploads, newest first. Anonymous comments show a neutral avatar.

### Song library

- Search by title, writer or lyric.
- Status filter pills with counts: All, In review, Review complete, Draft, Archived. "Filter by writer" link.
- Rows: title, writer · latest version, status tag, length, comment count. Newest first.

### Song page — member view (top to bottom)

1. Back arrow to Songs, status tag, key and tempo, title, writer and upload date.
2. Version picker: pill row with the **latest version on the right**, older versions to its left (v1, v2 … latest). Overflows by horizontal scroll, opening scrolled to the right. Choosing an older version switches the player, comment dots and feedback list to that version and shows "Playing v1 from [date]. The latest version is v2."
3. "What [writer] wants feedback on" card with a headphones icon — **above** the player.
4. Player: waveform (played part in brand green), comment dots above it (tap to jump), current time and length, back 10 s, play/pause (64 px green circle), forward 10 s.
5. Feedback box: textarea, placeholder "Write your feedback". Below it: pin button (left), slider labeled "Pinned at 1:42 · drag to move" (middle), round send button (right). Dragging the slider moves a dark pin marker along the waveform live. Tapping the pin button turns pinning off ("Not pinned · tap the pin to add one") so the comment applies to the whole song. By default the pin follows the playhead until the member drags it. After sending, show "Posted at 1:42. Thanks for the feedback!" and clear the box.
6. "RATE v2": Melody, Lyrics, Singable, Theology — five 40 px tappable circles each (1–5). Saves automatically.
7. Average-rating tiles.
8. Tabs: "Feedback on v2 (count)", Lyrics, Chord chart (PDF row with Open button).
9. Comments: avatar, name (or "Anonymous"), time ago, timestamp chip (tap to jump), text, Reply (opens an inline reply field), thumbs-up with count. Writer replies are indented with a "· writer" label.

### Song page — writer view

Same page on the writer's own song, plus a dark "YOUR SONG" card under the title showing the new-comment count, with "Upload v3" (left) and "Mark complete" / "Reopen" (right) on one row. Writers do not see the feedback box or the rating input on their own songs.

### Upload song

- Toggle: New song / New version (New version must ask which song).
- Audio drop zone: "Choose audio file", MP3 or M4A recommended, up to 100 MB, WAV allowed with a size warning. Progress bar showing MB uploaded.
- Fields in order: Song title · Key + Tempo (BPM) side by side · Lyrics · Feedback focus (placeholder "What feedback are you looking for?", helper "Shown above the player so listeners know what to listen for.") · Chord chart PDF (optional) · Status (In review / Draft).
- "Share song" button, centered, not full width.

### Anonymous comments

The data model supports them (no author saved). Paul removed the "Post anonymously" toggle from the feedback box — leave it out unless he asks for it back.

---

## Color tokens

CSS custom properties, switched with `prefers-color-scheme`.

| Token | Used for | Light | Dark |
| --- | --- | --- | --- |
| --bg | Page background | #F4F4F4 | #222222 |
| --card | Cards, inputs | #FFFFFF | #1A1A1A |
| --field | Text areas | #FAFAFA | #1F1F1F |
| --chip | Neutral tiles, segmented controls | #EEEEEE | #2B2B2B |
| --edge | Card and box outlines | #E2E2E2 | #5A8A26 |
| --line | Dividers | #E2E2E2 | #2E3D21 |
| --fieldline | Input borders | #D4D4D4 | #46622A |
| --text | Main text | #222222 | #E8E8E8 |
| --text2 | Secondary text | #444444 | #C4C4C4 |
| --muted | Meta text, timestamps | #5E5E5E | #A3A3A3 |
| --inverse | Dark surfaces (writer card, time chips) | #222222 | #2F2F2F |
| --accent | Links, outlines, small buttons | #3F7410 | #8CD13B |
| --accentink | Text on tinted green | #2F5A0B | #B6E384 |
| --onaccent | Text/icons on --accent buttons | #FFFFFF | #111111 |
| --tint | Light green fills, tags | #EAF5DC | #1F2C12 |
| --wave | Unplayed waveform bars | #D9D9D9 | #3B3B3B |
| --glass | Tab bar fill | rgba(255,255,255,0.72) | rgba(30,30,30,0.72) |
| --glassline | Tab bar outline | rgba(255,255,255,0.85) | rgba(140,209,59,0.35) |

**Brand green `#76BC21`** is used in both modes for the play button, played waveform, upload progress, rating selections and the announcement date tile. Text on it is always `#1A1A1A`, never white.

Tab bar glass: `backdrop-filter: blur(20px) saturate(180%)`, shadow `0 8px 28px rgba(0,0,0,0.14)`.

---

## Typography, spacing, components

Typeface: **Poppins** (Google Fonts, 400/500/600/700).

| Style | Size / weight | Example |
| --- | --- | --- |
| Song title | 30 px / 700 | Grace Upon Grace |
| Screen title | 26–28 px / 700 | Songwriters, SONGS |
| Section heading | 18 px / 700, uppercase | NEEDS YOUR FEEDBACK |
| Card heading | 15–18 px / 600–700 | What Sarah wants feedback on |
| Body | 15 px / 400, line-height 1.45 | Comment text, form fields |
| Meta | 13 px / 400, --muted | Sarah Mitchell · v2 · 12 comments |
| Label / tag | 11–12 px / 600–700, letter-spacing 0.06–0.08em | PINNED ANNOUNCEMENT, In review |

- 16 px side gutters; 10–22 px gaps between blocks; 112 px bottom padding so content clears the floating tab bar.
- Radii: buttons, tags and tab bar are full pills (999 px); cards 14–18 px; inputs 10 px; icon tiles 12 px.
- Minimum touch target 44 px; play button 64 px.
- Icons: 2 px stroke line icons (Lucide is a good match). No emoji.

Reusable components: pill button (primary / outline / brand), status tag (In review = --tint/--accent; Review complete = --inverse/white; Draft = --chip/--text2; Archived = --chip/--muted), song row card, comment card with threaded reply, timestamp chip, rating row, version picker, waveform player, glass tab bar, date tile.

---

## Tech stack and data model

| Piece | Choice |
| --- | --- |
| App | Next.js (App Router) + TypeScript on Vercel |
| Database | Neon Postgres |
| Sign-in | Neon Auth, admin-created accounts only |
| Audio (Phase 2) | Cloudflare R2, direct browser upload via short-lived signed URLs; playback via signed URLs |
| Player | WaveSurfer.js |
| Tests | Playwright (phone + laptop sizes, light + dark) and unit tests |

| Table | Key fields |
| --- | --- |
| members | id, first_name, last_name, email, role (admin / member), active |
| songs | id, writer_id, title, key, tempo, lyrics, feedback_focus, status, created_at |
| song_versions | id, song_id, version_number, audio_key, duration_seconds, file_size, notes, created_at |
| comments | id, version_id, author_id (null when anonymous), parent_id, timestamp_seconds (null = whole song), body, created_at |
| comment_reactions | comment_id, member_id |
| ratings | version_id, member_id, melody, lyrics, singability, theology (1–5) |
| announcements | id, author_id, title, body, event_at, pinned, created_at |

Status values: `draft`, `in_review`, `review_complete`, `archived`.

Privacy rule: an anonymous comment stores no author and no hidden link to one. Admins can delete it but cannot unmask it.

---

## Open questions (ask Paul)

- Final app/group name (design uses "PBC Songwriters" / "Songwriters")?
- Church logo file for the header?
- Web address: church subdomain (e.g. songs.pbcgreenville.org) or a free Vercel address to start?
- Bring back "Post anonymously" as a small toggle, or leave it out?
- Full tag set, and who can mark a song approved for Sunday use?

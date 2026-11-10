# PBC Songwriters

Private, invite-only, mobile-first web app for Palmetto Baptist Church's songwriting group: upload songs, listen, and leave timestamped feedback. See [`SPEC.md`](SPEC.md) and [`CLAUDE.md`](CLAUDE.md).

Stack: Next.js (App Router) + TypeScript · Neon Postgres · Neon Auth (admin-created accounts only) · Vercel · Playwright.

The earlier static marketing mockup lives in [`mockup/`](mockup/) and is still published to GitHub Pages.

## Phase 1 (this branch)

- Screens: Sign in (+ forgot / reset password), Home, Song library, Song page (member and writer views), Upload song. Light and dark mode follow the device setting.
- Real database tables (`db/migrations/001_init.sql`) and a seed script with sample members, songs, versions, comments, reactions, ratings and an announcement.
- Sign-in: Neon Auth email + password. Public sign-up is disabled in Neon Auth **and** blocked in the app; a session is only accepted if its email belongs to an active row in `members`.
- Phase 1 has no audio files yet (Cloudflare R2 is Phase 2). The player runs a real-time playhead over the version's length; Upload reads the chosen file's length/size in the browser and saves the song/version rows.

## Setup

```bash
cp .env.example .env.local   # fill in DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET, SEED_PASSWORD
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Vercel environment variables: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (32+ chars). Never set `AUTH_MODE=local` on Vercel (the app refuses to start that way).

### Offline development

`AUTH_MODE=local` runs against a local Postgres without the Neon Auth service. It checks the same `neon_auth.user` / `neon_auth.account` rows with Better Auth's own password hashing and keeps the session in a signed cookie. Create the local copy of those tables with `npm run db:migrate -- --local-auth`. Password-reset links are printed to the server console.

## Tests

```bash
TEST_DATABASE_URL=postgres://... npm test     # unit + schema tests
E2E_DATABASE_URL=postgres://... npm run build && npm run test:e2e
```

Playwright runs every screen at 390 px and 1280 px in light and dark mode, including: failed sign-in, signed-out visitors, inactive members, a song with 0 comments, 22 versions, 34 comments, long names and comments, touch targets ≥ 44 px, no sideways scrolling, and an axe WCAG 2 AA audit (4.5:1 contrast) of every screen.

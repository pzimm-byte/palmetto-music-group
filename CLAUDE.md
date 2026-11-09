# PBC Songwriters

Private, invite-only, mobile-first web app for Palmetto Baptist Church's songwriting group. The full spec is in `SPEC.md` — read it before starting any work.

## Stack

Next.js (App Router) + TypeScript, Neon Postgres, Neon Auth (admin-created accounts only), Vercel. Cloudflare R2 for audio in Phase 2. WaveSurfer.js for the player. Playwright for tests.

## Rules

- Never commit directly to `main`. Work on a feature branch per phase or feature.
- Before anything merges to `main`:
  1. Run unit tests and Playwright click-through tests on every screen at 390 px and 1280 px, in light and dark mode.
  2. Cover edge cases: song with 0 comments, 20+ versions, 30+ comments, long names/comments, failed sign-in, signed-out visitor.
  3. Deploy a Vercel preview and send Paul the preview link plus screenshots of every screen in both modes.
  4. Wait for Paul's written approval. Only then merge.
- Use the color tokens in `SPEC.md` as CSS custom properties; never hard-code colors in components.
- Text on brand green `#76BC21` is always `#1A1A1A`.
- Minimum touch target 44 px; text contrast 4.5:1 in both modes.
- Anonymous comments store no author_id and no hidden link to one.
- Never commit secrets. Keep connection strings and keys in `.env.local` (git-ignored) and Vercel environment variables.

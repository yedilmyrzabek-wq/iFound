# Decisions

One line each: time (Asia/Almaty), decision, why.

- 2026-11-14 15:40 — Migrations 001/002 copied verbatim from TZ §11; cities seeded in `003_seed_cities.sql`. Never edit applied migrations; schema changes get a new numbered file.
- 2026-11-14 15:45 — Threshold tests run against real Postgres functions inside a throwaway schema (`tests/helpers/db.ts`). They need `DATABASE_URL` and are skipped without it.
- 2026-11-14 15:50 — OSM has no `shop=games` within 8 km of central Austin, so board games are suggested at cafes, libraries and community centers. The TZ query is unchanged.
- 2026-11-14 15:55 — Austin venues hand-picked by OSM ref in `scripts/seed-venues.ts` (31 recognizable places). Other cities use the automatic balanced shortlist for now.
- 2026-11-14 22:00 — Map tiles: Esri World Street Map (no key needed). CARTO started returning "API key required" tiles, and the public tile.openstreetmap.org server is never used. Configurable via `NEXT_PUBLIC_MAP_TILES_URL`.
- 2026-11-14 16:05 — Design direction: felt letterboard / cinema marquee. Counts and statuses are spelled in plastic letters.
- 2026-11-14 16:10 — Emails go out in `after()`, so join/create responses stay fast. Exactly-once is guaranteed by `email_log` (`upsert … ignoreDuplicates`), not by timing.
- 2026-11-14 16:10 — Join returns 409 `already_joined` on a unique-index race (23505), the same meaning as the DB check.
- 2026-11-14 16:15 — Venue posting UI is hidden until P2. The API already creates the `venue_claims` row; the verify email comes in P2.
- 2026-11-14 16:15 — Report thresholds are counted over unresolved reports. Reports are idempotent per token via the unique indexes.
- 2026-11-14 23:30 — Swipe deck migration is `004_guest_profiles.sql`, not `003_…` as in TZ v1.1: 003 was already applied (cities), and applied migrations are never edited.
- 2026-11-14 23:30 — "This week" in the deck = now → 7 days ahead, in the city's zone. `first` is ignored silently when the plan isn't joinable for the viewer.
- 2026-11-14 23:45 — Sweep scheduler: Supabase `pg_cron` + `pg_net` every 10 min (TZ §17 allows it). No external account needed; the secret lives only in the DB job, never in the repo.
- 2026-11-14 23:50 — Venue claims are reused per venue + email, so one manage link covers every plan that person posted for the place.
- 2026-11-15 00:10 — Test 10 (paywall) runs over HTTP against a live server (`TEST_BASE_URL`), because the limit logic is in the API layer by design (the DB functions stay pure threshold logic).
- 2026-11-15 00:20 — Avatars: the client crops to 256×256 WebP; the server only accepts real WebP (magic bytes), ≤300 KB, into the private bucket.
- 2026-11-15 01:00 — Jury demo: a judge tests alone, so a threshold of 3 can't fill by itself. "Start the 60-second demo" creates a fresh is_demo plan (code `demo****`) with "Add a demo guest" (real join_event, guests labeled "(demo)") and "Skip to the fill deadline" (moves start, runs the real sweep). Allowed by the case FAQ (Q35, Q66, Q69). Demo plans are excluded from lists and the deck; `@demo.invalid` addresses get no email.
- 2026-11-15 02:00 — "Run it again next week" is built from scratch (the expected bundle wasn't available): migration `005_repeat_and_funnel.sql` with `repeat_event()` (same local time +7 days, DST-safe, locks the source, reuses `create_event`), one repeat per plan via a unique index. Human hosts need iFound+; venues and demo plans are free.
- 2026-11-15 02:00 — Day-before reminders run inside the existing 10-minute sweep via `due_reminders()` (confirmed, starting in 20-26 h), deduped per participant in `email_log`.
- 2026-11-15 02:00 — Funnel: server-side facts + `/api/track` for views/clicks/swipes, demo plans excluded. Test traffic from our own end-to-end runs was cleared before judging.
- 2026-11-15 02:00 — Segment copy "New in town": no interviews were run, so the copy says "Moving to a new city usually means starting your social life from zero." instead of quoting users.

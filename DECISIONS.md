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

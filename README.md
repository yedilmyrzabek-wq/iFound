# iFound

**Plans that only happen when enough people are in.** Pick a plan near you and tap *I'm in*. If enough people join, it's on and everyone gets an email. If not, it's quietly called off 2 hours before start — nobody shows up alone.

Live: _URL goes here once deployed_ · Built for Zimran Business Cup 2.0 · US market, 5 cities, Austin first.

## How to check (for the jury)

No account, no password, no email verification.

1. Open **Austin** → open any plan.
2. Tap **I'm in** → first name, email, "I'm 18 or older" → **Count me in**. The counter updates on every open screen within ~8 seconds.
3. When the plan reaches its minimum, everyone gets **"It's on"** with a calendar invite (`.ics`).
4. **Start a plan**: pick an activity, a real place, and a time in the city's time zone (shown as e.g. *Central Time (Austin)*).
5. Start a second plan in the same month → paywall → iFound+ with Stripe test card **4242 4242 4242 4242**.

Times are always shown in the plan's city zone, with a "That's … in your time" line for viewers elsewhere (for example in Astana).

## Where the core is

- **[`supabase/migrations/002_functions.sql`](supabase/migrations/002_functions.sql)**: `create_event`, `join_event`, `leave_event`, `cancel_event`, `sweep_events`. All threshold logic lives here, under `SELECT … FOR UPDATE` on the plan row. TypeScript only reacts to the function results.
- **[`tests/threshold.test.ts`](tests/threshold.test.ts)**: runs against real Postgres. The key one is **10 parallel joins** to a plan with min 6 and max 10: the count ends at exactly 10 (host + 9), one request gets `full`, and exactly one request gets `just_confirmed = true`, so exactly one "It's on" email goes out.
- Exactly-once email: `email_log.dedupe_key` (`confirmed:<event>:<participant>`) with `ON CONFLICT DO NOTHING` ([`lib/email/send.ts`](lib/email/send.ts)).
- Effective status on read ([`lib/status.ts`](lib/status.ts)): if the sweep cron is late, an unfilled plan already reads as called off.
- Privacy: guests never receive participant names or photos from the server ([`lib/events.ts`](lib/events.ts)). Participant emails never leave the server.

## Stack

```
Browser (Next.js 15, React 19) ── HTTPS, same origin only
  └─ Vercel: route handlers /api/*, server components, middleware (ifound_uid cookie)
       ├─ Supabase Postgres (+ functions)     ← service_role key, server only
       ├─ Supabase Storage (private avatars)
       ├─ Resend (email)
       └─ Stripe (Checkout, webhooks, test mode)
External pinger every 10 min → GET /api/cron/sweep (Bearer CRON_SECRET)
```

Tailwind CSS v4, Leaflet + react-leaflet (client-only, `L.divIcon` markers), Luxon (IANA zones), zod, SWR polling, nanoid, Vitest.

## Run locally

```bash
npm install
cp .env.example .env.local      # fill in Supabase, Resend, secrets
npm run db:migrate              # applies supabase/migrations/*.sql, loads data/venues/*.json
npm run dev
npm test                        # Postgres tests need DATABASE_URL (direct connection)
```

Environment variables are listed in [`.env.example`](.env.example). No Supabase key has a `NEXT_PUBLIC_` prefix: the browser never talks to the database.

## Data and attribution

Venues come from **OpenStreetMap** via Overpass, fetched once by [`scripts/seed-venues.ts`](scripts/seed-venues.ts) and committed to `data/venues/`. The runtime never calls Overpass. Bars, pubs and nightclubs are excluded. Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL). Tiles by CARTO.

Demo plans are created through the product by the team and carry a **Demo** badge. There are no fake participants: every count comes from real joins.

## Honest limitations

- Emails are not verified. Uniqueness by email (case-insensitive) stops one person from filling a plan alone by clearing cookies, but a determined person can use several addresses.
- SMS, venue discounts and AI features ("Plan it for me", moderation) are second-queue work. `lib/ai/` is the hook point, behind `FEATURE_AI`.
- Stripe runs in test mode only.

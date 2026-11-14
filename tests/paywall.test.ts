// Test 10 (TZ §21): the 2nd own plan within 30 days without iFound+ → 402 upgrade_required;
// a plan posted as a venue is never limited. Runs against a live server: set TEST_BASE_URL (e.g. http://localhost:3000).
import { afterAll, describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import pg from "pg";
import { DATABASE_URL } from "./helpers/db";

const BASE = process.env.TEST_BASE_URL ?? "";
const MARK = `paywall-test-${Date.now()}`;

if (!BASE) console.warn("[tests] TEST_BASE_URL not set — skipping HTTP paywall test");

describe.skipIf(!BASE || !DATABASE_URL)("10. free monthly limit (HTTP)", () => {
  let cookie = "";
  const email = `${MARK}@example.com`;

  async function create(extra: Record<string, unknown> = {}) {
    const venues = await (await fetch(`${BASE}/api/cities/austin/venues`)).json();
    const startsAtLocal = DateTime.now().setZone("America/Chicago").plus({ days: 2 }).set({ hour: 18, minute: 0 }).toFormat("yyyy-LL-dd'T'HH:mm");
    const res = await fetch(`${BASE}/api/events`, {
      method: "POST",
      headers: { Origin: BASE, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify({
        city: "austin",
        venueId: venues.venues[0].id,
        place: null,
        activity: "coffee",
        activityOther: null,
        title: "",
        description: MARK,
        startsAtLocal,
        durationMinutes: 60,
        minPeople: 3,
        maxPeople: 6,
        host: { name: "Tester", email, photoPath: null, is18: true },
        asVenue: { enabled: false, email: null },
        ...extra,
      }),
    });
    const set = res.headers.get("set-cookie");
    if (set && !cookie) cookie = set.split(";")[0];
    return res;
  }

  afterAll(async () => {
    const c = new pg.Client({ connectionString: DATABASE_URL, ssl: /localhost/.test(DATABASE_URL) ? false : { rejectUnauthorized: false } });
    await c.connect();
    const ids = (await c.query("select id, venue_claim_id from events where description = $1", [MARK])).rows;
    for (const r of ids) await c.query("delete from email_log where dedupe_key like $1", [`%${r.id}%`]);
    await c.query("delete from events where description = $1", [MARK]);
    await c.query("delete from venue_claims where email like $1", [`${MARK}%`]);
    await c.query("delete from guest_profiles where email = $1", [email]);
    await c.end();
  });

  it("first own plan is free, the second asks for iFound+, a venue plan is never limited", async () => {
    expect((await create()).status).toBe(201);
    const second = await create();
    expect(second.status).toBe(402);
    expect((await second.json()).error).toBe("upgrade_required");
    const venue = await create({ asVenue: { enabled: true, email: `${MARK}+venue@example.com` } });
    expect(venue.status).toBe(201);
  });
});

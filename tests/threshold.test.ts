// Core mechanic tests against the real Postgres functions in supabase/migrations/002_functions.sql (TZ §21).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDb, hasDb, join, makeEvent, shiftStart, type TestDb } from "./helpers/db";

if (!hasDb) console.warn("[tests] DATABASE_URL not set — skipping Postgres threshold tests");

describe.skipIf(!hasDb)("threshold logic (Postgres functions)", () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await createTestDb();
  }, 60_000);
  afterAll(async () => {
    await db?.close();
  });

  it("1. joining up to the threshold confirms the plan, just_confirmed exactly once", async () => {
    const { id } = await makeEvent(db, { min: 3, max: 6 }); // host = 1 of 3
    const a = await join(db, id);
    expect(a).toMatchObject({ r_result: "joined", r_status: "filling", r_count: 2, r_just_confirmed: false });
    const b = await join(db, id);
    expect(b).toMatchObject({ r_result: "joined", r_status: "confirmed", r_count: 3, r_just_confirmed: true });
    const c = await join(db, id);
    expect(c).toMatchObject({ r_result: "joined", r_status: "confirmed", r_count: 4, r_just_confirmed: false });
    const { rows } = await db.pool.query("select status, confirmed_at from events where id = $1", [id]);
    expect(rows[0].status).toBe("confirmed");
    expect(rows[0].confirmed_at).not.toBeNull();
  });

  it("2. 10 parallel joins (min 6, max 10) → count 10, confirmed, just_confirmed on exactly one request", async () => {
    const { id } = await makeEvent(db, { min: 6, max: 10 }); // host already counts as 1
    // 10 concurrent requests on separate connections; only 9 seats remain.
    const results = await Promise.all(
      Array.from({ length: 10 }, async () => {
        const client = await db.pool.connect();
        try {
          return await join(client, id);
        } finally {
          client.release();
        }
      }),
    );
    const joined = results.filter((r) => r.r_result === "joined");
    const full = results.filter((r) => r.r_result === "full");
    expect(joined).toHaveLength(9);
    expect(full).toHaveLength(1);
    expect(results.filter((r) => r.r_just_confirmed)).toHaveLength(1);

    const { rows } = await db.pool.query(
      `select e.status, e.participant_count,
              (select count(*)::int from participants p where p.event_id = e.id and p.left_at is null) as actual
         from events e where e.id = $1`,
      [id],
    );
    expect(rows[0]).toEqual({ status: "confirmed", participant_count: 10, actual: 10 });
  });

  it("3. joining beyond max → full", async () => {
    const { id } = await makeEvent(db, { min: 3, max: 3 });
    await join(db, id);
    await join(db, id);
    expect((await join(db, id)).r_result).toBe("full");
  });

  it("4. same token, or same email in another case → already_joined", async () => {
    const { id } = await makeEvent(db, { min: 5, max: 8 });
    const token = randomUUID();
    expect((await join(db, id, "sam@example.com", token)).r_result).toBe("joined");
    expect((await join(db, id, "other@example.com", token)).r_result).toBe("already_joined");
    expect((await join(db, id, "SAM@Example.COM")).r_result).toBe("already_joined");
  });

  it("5. leaving a confirmed plan → count −1, stays confirmed", async () => {
    const { id } = await makeEvent(db, { min: 3, max: 6 });
    const a = await join(db, id);
    await join(db, id);
    const { rows } = await db.pool.query("select * from leave_event($1)", [a.r_participant_id]);
    expect(rows[0]).toMatchObject({ r_result: "left", r_status: "confirmed", r_count: 2 });
    const again = await db.pool.query("select * from leave_event($1)", [a.r_participant_id]);
    expect(again.rows[0].r_result).toBe("not_joined");
  });

  it("6. the host can't leave → host_must_cancel", async () => {
    const { id } = await makeEvent(db);
    const host = await db.pool.query("select id from participants where event_id = $1 and is_host", [id]);
    const { rows } = await db.pool.query("select * from leave_event($1)", [host.rows[0].id]);
    expect(rows[0].r_result).toBe("host_must_cancel");
  });

  it("7. joining after the fill deadline while filling → closed", async () => {
    const { id } = await makeEvent(db, { min: 5, max: 8 });
    await shiftStart(db, id, 90); // starts in 1.5 h → deadline (start − 2 h) has passed
    expect((await join(db, id)).r_result).toBe("closed");
  });

  it("7b. a confirmed plan still accepts joins inside the last 2 hours, but not after start", async () => {
    const { id } = await makeEvent(db, { min: 3, max: 6 });
    await join(db, id);
    await join(db, id);
    await shiftStart(db, id, 60);
    expect((await join(db, id)).r_result).toBe("joined");
    await shiftStart(db, id, -1);
    expect((await join(db, id)).r_result).toBe("closed");
  });

  it("8. sweep_events cancels an unfilled plan and completes a past confirmed one", async () => {
    const unfilled = await makeEvent(db, { min: 5, max: 8 });
    await shiftStart(db, unfilled.id, 60);

    const done = await makeEvent(db, { min: 3, max: 6, duration: 60 });
    await join(db, done.id);
    await join(db, done.id);
    await shiftStart(db, done.id, -61);

    const stillOpen = await makeEvent(db, { min: 5, max: 8 });

    const { rows } = await db.pool.query("select * from sweep_events()");
    const actions = new Map(rows.map((r) => [r.r_event_id, r.r_action]));
    expect(actions.get(unfilled.id)).toBe("cancelled_unfilled");
    expect(actions.get(done.id)).toBe("completed");
    expect(actions.has(stillOpen.id)).toBe(false);

    const st = await db.pool.query("select id, status, cancel_reason from events where id = any($1)", [
      [unfilled.id, done.id, stillOpen.id],
    ]);
    const byId = new Map(st.rows.map((r) => [r.id, r]));
    expect(byId.get(unfilled.id)).toMatchObject({ status: "cancelled", cancel_reason: "unfilled" });
    expect(byId.get(done.id)).toMatchObject({ status: "completed" });
    expect(byId.get(stillOpen.id)).toMatchObject({ status: "filling" });
  });

  it("create_event rejects a start sooner than 3 hours or later than 30 days", async () => {
    await expect(makeEvent(db, { startsInHours: 2 })).rejects.toThrow(/starts_at_out_of_range/);
    await expect(makeEvent(db, { startsInHours: 31 * 24 })).rejects.toThrow(/starts_at_out_of_range/);
  });

  it("cancel_event is final and can't be re-applied", async () => {
    const { id } = await makeEvent(db);
    expect((await db.pool.query("select cancel_event($1,'host') as r", [id])).rows[0].r).toBe("cancelled");
    expect((await db.pool.query("select cancel_event($1,'host') as r", [id])).rows[0].r).toBe("closed");
    expect((await join(db, id)).r_result).toBe("closed");
  });
});

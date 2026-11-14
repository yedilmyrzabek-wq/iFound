// Weekly repeat and day-before reminders (TZ final fixes §3, §4) against the real Postgres functions.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, hasDb, join, makeEvent, shiftStart, type TestDb } from "./helpers/db";

describe.skipIf(!hasDb)("repeat_event and due_reminders", () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await createTestDb();
  }, 60_000);
  afterAll(async () => {
    await db?.close();
  });

  async function confirmed(min = 3) {
    const e = await makeEvent(db, { min, max: 6, startsInHours: 48 });
    for (let i = 1; i < min; i++) await join(db, e.id);
    return e;
  }

  it("repeats a confirmed plan at the same local time one week later, host already in", async () => {
    const src = await confirmed();
    const { rows } = await db.pool.query("select repeat_event($1, 'rep00001', null) as id", [src.id]);
    const r = await db.pool.query(
      `select n.status, n.participant_count, n.repeat_of, n.host_token,
              to_char(n.starts_at at time zone 'America/Chicago', 'HH24:MI') as n_local,
              to_char(s.starts_at at time zone 'America/Chicago', 'HH24:MI') as s_local,
              round(extract(epoch from (n.starts_at - s.starts_at)) / 86400) as days
         from events n join events s on s.id = n.repeat_of where n.id = $1`,
      [rows[0].id],
    );
    expect(r.rows[0]).toMatchObject({ status: "filling", participant_count: 1, repeat_of: src.id, host_token: src.hostToken });
    expect(r.rows[0].n_local).toBe(r.rows[0].s_local);
    expect(Number(r.rows[0].days)).toBe(7);
  });

  it("refuses a filling plan and a second repeat", async () => {
    const filling = await makeEvent(db, { min: 5, max: 8 });
    await expect(db.pool.query("select repeat_event($1, 'rep00002', null)", [filling.id])).rejects.toThrow(/not_repeatable/);
    const src = await confirmed();
    await db.pool.query("select repeat_event($1, 'rep00003', null)", [src.id]);
    await expect(db.pool.query("select repeat_event($1, 'rep00004', null)", [src.id])).rejects.toThrow(/already_repeated/);
  });

  it("due_reminders finds a confirmed plan 24 h out, not 2 h or 48 h out, and not filling ones", async () => {
    const soon = await confirmed();
    const tomorrow = await confirmed();
    const later = await confirmed();
    const unfilled = await makeEvent(db, { min: 5, max: 8 });
    await shiftStart(db, soon.id, 120);
    await shiftStart(db, tomorrow.id, 24 * 60);
    await shiftStart(db, later.id, 48 * 60);
    await shiftStart(db, unfilled.id, 24 * 60);
    const { rows } = await db.pool.query("select r_event_id from due_reminders()");
    const ids = rows.map((r) => r.r_event_id);
    expect(ids).toContain(tomorrow.id);
    expect(ids).not.toContain(soon.id);
    expect(ids).not.toContain(later.id);
    expect(ids).not.toContain(unfilled.id);
  });
});

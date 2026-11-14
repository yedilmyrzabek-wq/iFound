// Test DB: applies 001 + 002 into a throwaway schema, so tests never touch real data.
// Needs DATABASE_URL (a direct Postgres connection — Supabase "Session"/direct URL, or a local Postgres).
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";

for (const f of [".env.test.local", ".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}

export const DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
export const hasDb = !!DATABASE_URL;

export interface TestDb {
  pool: pg.Pool;
  schema: string;
  close(): Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const schema = `test_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const ssl = /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false };
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl, max: 12 });
  pool.on("connect", (c) => {
    c.query(`set search_path to ${schema}, extensions`);
  });

  const c = await pool.connect();
  try {
    await c.query(`create schema ${schema}`);
    await c.query(`set search_path to ${schema}, extensions`);
    const dir = path.join(process.cwd(), "supabase", "migrations");
    // pgcrypto is already installed on Supabase/most hosts; gen_random_uuid() is core since PG13.
    const init = readFileSync(path.join(dir, "001_init.sql"), "utf8").replace(/create extension[^;]*;/i, "");
    await c.query(init);
    await c.query(readFileSync(path.join(dir, "002_functions.sql"), "utf8"));
    await c.query(readFileSync(path.join(dir, "003_seed_cities.sql"), "utf8"));
  } finally {
    c.release();
  }

  return {
    pool,
    schema,
    async close() {
      await pool.query(`drop schema ${schema} cascade`);
      await pool.end();
    },
  };
}

let seq = 0;

/** Creates a plan via create_event (host = first participant). Returns its id and the host token. */
export async function makeEvent(
  db: TestDb,
  opts: { min?: number; max?: number; startsInHours?: number; duration?: number } = {},
) {
  const hostToken = randomUUID();
  const { rows } = await db.pool.query(
    `select create_event($1,'austin',null,'Zilker Park',30.2669,-97.7729,'run',null,'Run at Zilker',null,
       now() + make_interval(hours => $2), $3, $4, $5, $6, 'Host', $7, null, null, false, null) as id`,
    [
      `t${randomUUID().slice(0, 7)}${seq++}`,
      opts.startsInHours ?? 24,
      opts.duration ?? 120,
      opts.min ?? 3,
      opts.max ?? 6,
      hostToken,
      `host${seq}@example.com`,
    ],
  );
  return { id: rows[0].id as string, hostToken };
}

export async function join(db: TestDb | pg.PoolClient, eventId: string, email?: string, token?: string) {
  const q = "schema" in db ? db.pool : db;
  const { rows } = await q.query(`select * from join_event($1, $2, 'Guest', $3, null, null)`, [
    eventId,
    token ?? randomUUID(),
    email ?? `g${randomUUID().slice(0, 8)}@example.com`,
  ]);
  return rows[0] as { r_result: string; r_status: string; r_count: number; r_participant_id: string; r_just_confirmed: boolean };
}

/** Moves a plan's times without going through create_event's range check (for deadline/sweep tests). */
export async function shiftStart(db: TestDb, eventId: string, startsInMinutes: number) {
  await db.pool.query(`update events set starts_at = now() + make_interval(mins => $2) where id = $1`, [eventId, startsInMinutes]);
}

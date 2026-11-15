// Rate limits via the rate_hits table (TZ §16). IP limits are intentionally soft:
// the whole jury shares one university NAT, so the token is the real guard.
import "server-only";
import { db } from "./db";

type Rule = { bucket: string; max: number; windowMinutes: number };

export const RULES = {
  createToken: (t: string): Rule => ({ bucket: `create:token:${t}`, max: 3, windowMinutes: 24 * 60 }),
  createIp: (ip: string): Rule => ({ bucket: `create:ip:${ip}`, max: 100, windowMinutes: 24 * 60 }),
  joinToken: (t: string): Rule => ({ bucket: `join:token:${t}`, max: 30, windowMinutes: 60 }),
  joinIp: (ip: string): Rule => ({ bucket: `join:ip:${ip}`, max: 300, windowMinutes: 60 }),
  uploadToken: (t: string): Rule => ({ bucket: `upload:token:${t}`, max: 20, windowMinutes: 60 }),
  reportToken: (t: string): Rule => ({ bucket: `report:token:${t}`, max: 20, windowMinutes: 24 * 60 }),
  waitlistToken: (t: string): Rule => ({ bucket: `waitlist:token:${t}`, max: 10, windowMinutes: 24 * 60 }),
  restoreToken: (t: string): Rule => ({ bucket: `restore:token:${t}`, max: 5, windowMinutes: 60 }),
};

/** True if every rule still has room. */
export async function underLimits(rules: (Rule | null)[]): Promise<boolean> {
  const active = rules.filter((r): r is Rule => !!r);
  const results = await Promise.all(
    active.map(async (r) => {
      const since = new Date(Date.now() - r.windowMinutes * 60_000).toISOString();
      const { count, error } = await db()
        .from("rate_hits")
        .select("id", { count: "exact", head: true })
        .eq("bucket", r.bucket)
        .gte("at", since);
      if (error) throw error;
      return (count ?? 0) < r.max;
    }),
  );
  return results.every(Boolean);
}

export async function recordHits(rules: (Rule | null)[]): Promise<void> {
  const rows = rules.filter((r): r is Rule => !!r).map((r) => ({ bucket: r.bucket }));
  if (rows.length) await db().from("rate_hits").insert(rows);
}

/**
 * Free plan: 1 own plan per 30 days, counted by token AND by host email (so clearing cookies doesn't help).
 * Venue plans and demo plans don't count.
 */
export async function ownPlansLast30Days(token: string, email: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const base = () =>
    db()
      .from("events")
      .select("id", { count: "exact", head: true })
      .is("venue_claim_id", null)
      .eq("is_demo", false)
      .gte("created_at", since);
  const [byToken, byEmail] = await Promise.all([
    base().eq("host_token", token),
    base().ilike("host_email", email.replace(/[\\%_]/g, (m) => `\\${m}`)),
  ]);
  if (byToken.error) throw byToken.error;
  if (byEmail.error) throw byEmail.error;
  return Math.max(byToken.count ?? 0, byEmail.count ?? 0);
}

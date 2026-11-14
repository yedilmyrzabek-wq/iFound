// Scheduled sweep (TZ §17). An external pinger calls it every 10 min with Authorization: Bearer <CRON_SECRET>.
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/http";
import { notifyCancelled } from "@/lib/email/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "forbidden", message: "Bad cron secret." }, { status: 401 });
  const { data, error } = await db().rpc("sweep_events");
  if (error) return NextResponse.json({ error: "server_error", message: error.message }, { status: 500 });
  const rows = (data ?? []) as { r_event_id: string; r_action: string }[];
  const site = siteUrl(req);
  const cancelled = rows.filter((r) => r.r_action === "cancelled_unfilled");
  // Idempotent via email_log, so a retried sweep never double-sends.
  await Promise.all(cancelled.map((r) => notifyCancelled(r.r_event_id, "unfilled", site).catch((e) => console.error(e))));
  return NextResponse.json({
    cancelled: cancelled.length,
    completed: rows.filter((r) => r.r_action === "completed").length,
  });
}

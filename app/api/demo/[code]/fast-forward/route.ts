// "Time travel" for the jury demo (FAQ Q35): moves a demo plan's start so the real sweep_events() acts on it.
// filling → just past the fill deadline → called off; confirmed → past its end → happened.
import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { db } from "@/lib/db";
import { apiError, badOrigin, originOk, previewBlocked, siteUrl } from "@/lib/http";
import { isDemoCode } from "@/lib/demo";
import { notifyCancelled } from "@/lib/email/notify";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const { code } = await params;
  if (!isDemoCode(code)) return apiError("forbidden", "Demo controls work only on demo plans.", 403);
  const { data: ev } = await db().from("events").select("id, is_demo, status, duration_minutes").eq("code", code).maybeSingle();
  if (!ev?.is_demo) return apiError("not_found", "Demo plan not found.", 404);
  const now = DateTime.utc();
  let startsAt: string;
  if (ev.status === "filling") startsAt = now.plus({ minutes: 119 }).toISO()!; // start − 2 h is now in the past
  else if (ev.status === "confirmed") startsAt = now.minus({ minutes: ev.duration_minutes + 1 }).toISO()!;
  else return apiError("closed", "This demo plan is already over.", 410);
  await db().from("events").update({ starts_at: startsAt }).eq("id", ev.id);
  const { data } = await db().rpc("sweep_events");
  const rows = (data ?? []) as { r_event_id: string; r_action: string }[];
  const site = siteUrl(req);
  await Promise.all(
    rows.filter((r) => r.r_action === "cancelled_unfilled").map((r) => notifyCancelled(r.r_event_id, "unfilled", site).catch(() => null)),
  );
  return NextResponse.json({ ok: true });
}

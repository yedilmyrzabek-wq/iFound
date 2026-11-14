import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { apiError, badOrigin, clientIp, originOk, previewBlocked, siteUrl } from "@/lib/http";
import { addDemoGuest, isDemoCode } from "@/lib/demo";
import { notifyJoin } from "@/lib/email/notify";

export const dynamic = "force-dynamic";

// Adds one labeled demo person through the real join_event. Only on jury demo plans.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const { code } = await params;
  if (!isDemoCode(code)) return apiError("forbidden", "Demo controls work only on demo plans.", 403);
  const { data: ev } = await db().from("events").select("id, is_demo").eq("code", code).maybeSingle();
  if (!ev?.is_demo) return apiError("not_found", "Demo plan not found.", 404);
  const row = await addDemoGuest(ev.id, clientIp(req));
  if (!row || row.r_result !== "joined") {
    const full = row?.r_result === "full";
    return apiError(full ? "full" : "closed", full ? "This plan is full." : "This plan isn't taking people anymore.", 409);
  }
  // Real participants get the real emails ("It's on" etc.); demo addresses are skipped in sendOnce.
  const site = siteUrl(req);
  after(() => notifyJoin(ev.id, row.r_participant_id!, row.r_just_confirmed, row.r_status, site).catch((e) => console.error(e)));
  return NextResponse.json({ result: "joined", status: row.r_status, count: row.r_count, justConfirmed: row.r_just_confirmed });
}

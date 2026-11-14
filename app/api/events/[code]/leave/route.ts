import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, badOrigin, originOk, userToken, previewBlocked } from "@/lib/http";
import { leaveError, leaveParticipant } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const { code } = await params;
  const token = await userToken();
  const { data: ev } = await db().from("events").select("id").eq("code", code).maybeSingle();
  if (!ev) return apiError("not_found", "This plan doesn't exist.", 404);
  const { data: p } = await db()
    .from("participants")
    .select("id")
    .eq("event_id", ev.id)
    .eq("user_token", token)
    .is("left_at", null)
    .maybeSingle();
  if (!p) return apiError("not_joined", "You're not in this plan.", 404);
  const row = await leaveParticipant(p.id);
  if (!row || row.r_result !== "left") return leaveError(row?.r_result);
  return NextResponse.json({ result: "left", status: row.r_status, count: row.r_count });
}

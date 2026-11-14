// Reports (TZ §16): 3 reports from different tokens hide a plan; 2 on a participant hide their photo.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, badOrigin, originOk, userToken, previewBlocked } from "@/lib/http";
import { RULES, recordHits, underLimits } from "@/lib/limits";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().min(1).max(20),
  participantId: z.string().uuid().nullable().default(null),
  reason: z.enum(["spam", "inappropriate", "unsafe", "fake", "other"]),
  details: z.string().trim().max(500).nullable().default(null),
});

export async function POST(req: Request) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("invalid_input", "Pick a reason.", 400);
  const { code, participantId, reason, details } = parsed.data;
  const token = await userToken();
  if (!(await underLimits([RULES.reportToken(token)]))) return apiError("rate_limited", "Too many reports today.", 429);

  const { data: ev } = await db().from("events").select("id").eq("code", code).maybeSingle();
  if (!ev) return apiError("not_found", "This plan doesn't exist.", 404);

  if (participantId) {
    const { data: p } = await db().from("participants").select("id").eq("id", participantId).eq("event_id", ev.id).maybeSingle();
    if (!p) return apiError("not_found", "That person isn't in this plan.", 404);
  }

  const { error } = await db()
    .from("reports")
    .insert({ event_id: ev.id, participant_id: participantId, reporter_token: token, reason, details });
  // 23505 = this token already reported it: fine, idempotent.
  if (error && error.code !== "23505") return apiError("server_error", "Couldn't send the report.", 500);
  await recordHits([RULES.reportToken(token)]);

  if (participantId) {
    const { count } = await db()
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", participantId)
      .is("resolved_at", null);
    if ((count ?? 0) >= 2) await db().from("participants").update({ photo_hidden: true }).eq("id", participantId);
  } else {
    const { count } = await db()
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .is("participant_id", null)
      .is("resolved_at", null);
    if ((count ?? 0) >= 3) await db().from("events").update({ hidden: true }).eq("id", ev.id);
  }
  return NextResponse.json({ ok: true });
}

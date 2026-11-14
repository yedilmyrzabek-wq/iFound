import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { apiError, badOrigin, isAdmin, originOk, siteUrl, userToken, previewBlocked } from "@/lib/http";
import { cancelEvent } from "@/lib/lifecycle";
import { notifyCancelled } from "@/lib/email/notify";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const { code } = await params;
  const token = await userToken();
  const admin = await isAdmin();
  const { data: ev } = await db().from("events").select("id, host_token").eq("code", code).maybeSingle();
  if (!ev) return apiError("not_found", "This plan doesn't exist.", 404);
  const isHost = ev.host_token === token;
  if (!isHost && !admin) return apiError("forbidden", "Only the host can cancel this plan.", 403);
  const reason = isHost ? "host" : "moderation";
  const r = await cancelEvent(ev.id, reason);
  if (r !== "cancelled") return apiError("closed", "This plan is already over or called off.", 410);
  const site = siteUrl(req);
  after(() => notifyCancelled(ev.id, reason, site).catch((e) => console.error("cancel email", e)));
  return NextResponse.json({ result: "cancelled" });
}

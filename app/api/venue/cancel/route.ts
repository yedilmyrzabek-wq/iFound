import { NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, badOrigin, originOk, previewBlocked, siteUrl } from "@/lib/http";
import { cancelEvent } from "@/lib/lifecycle";
import { notifyCancelled } from "@/lib/email/notify";
import { claimFromToken, siblingClaimIds } from "@/lib/venue";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const parsed = z.object({ token: z.string().min(10).max(500), code: z.string().min(4).max(20) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("invalid_input", "This link is broken.", 400);
  const claim = await claimFromToken(parsed.data.token);
  if (!claim || !claim.verifiedAt) return apiError("forbidden", "Confirm you represent this place first.", 403);
  const ids = await siblingClaimIds(claim);
  const { data: ev } = await db().from("events").select("id, venue_claim_id").eq("code", parsed.data.code).maybeSingle();
  if (!ev || !ids.includes(ev.venue_claim_id)) return apiError("forbidden", "This isn't one of your plans.", 403);
  const r = await cancelEvent(ev.id, "host");
  if (r !== "cancelled") return apiError("closed", "This plan is already over or called off.", 410);
  const site = siteUrl(req);
  after(() => notifyCancelled(ev.id, "host", site).catch((e) => console.error("cancel email", e)));
  return NextResponse.json({ result: "cancelled" });
}

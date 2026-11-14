import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, badOrigin, originOk, previewBlocked } from "@/lib/http";
import { claimFromToken, siblingClaimIds } from "@/lib/venue";

export const dynamic = "force-dynamic";

// POST only: email scanners open GET links automatically.
export async function POST(req: Request) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const parsed = z.object({ token: z.string().min(10).max(500) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("invalid_input", "This link is broken.", 400);
  const claim = await claimFromToken(parsed.data.token);
  if (!claim) return apiError("forbidden", "This link has expired or is invalid.", 403);
  const ids = await siblingClaimIds(claim);
  await db().from("venue_claims").update({ verified_at: new Date().toISOString() }).in("id", ids).is("verified_at", null);
  return NextResponse.json({ ok: true });
}

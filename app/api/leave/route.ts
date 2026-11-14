// Leave via the signed link from an email. POST only: mail scanners open GET links automatically.
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, badOrigin, originOk, previewBlocked } from "@/lib/http";
import { verifyLink } from "@/lib/sign";
import { leaveError, leaveParticipant } from "@/lib/lifecycle";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const parsed = z.object({ token: z.string().min(10).max(500) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("invalid_input", "This link is broken.", 400);
  const link = verifyLink(parsed.data.token, "leave");
  if (!link) return apiError("forbidden", "This link has expired or is invalid.", 403);
  const row = await leaveParticipant(link.id);
  if (!row || row.r_result !== "left") return leaveError(row?.r_result);
  return NextResponse.json({ result: "left", status: row.r_status, count: row.r_count });
}

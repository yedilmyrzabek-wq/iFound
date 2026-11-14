import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, badOrigin, originOk, previewBlocked, userToken } from "@/lib/http";
import { verifyLink } from "@/lib/sign";
import { linkToken } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const parsed = z.object({ token: z.string().min(10).max(500) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("invalid_input", "This link is broken.", 400);
  const link = verifyLink(parsed.data.token, "restore");
  if (!link) return apiError("forbidden", "This link has expired. Ask for a new one.", 403);
  await linkToken(link.id, await userToken());
  return NextResponse.json({ ok: true });
}

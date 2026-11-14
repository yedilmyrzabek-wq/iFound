import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, badOrigin, originOk, userToken, previewBlocked } from "@/lib/http";
import { RULES, recordHits, underLimits } from "@/lib/limits";
import { track } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), city: z.string().trim().min(2).max(60) });

export async function POST(req: Request) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("invalid_input", "Add a valid email and your city.", 400);
  const token = await userToken();
  if (!(await underLimits([RULES.waitlistToken(token)]))) return apiError("rate_limited", "That's plenty for today.", 429);
  const { error } = await db().from("waitlist").insert(parsed.data);
  if (error && error.code !== "23505") return apiError("server_error", "Couldn't save that.", 500);
  await recordHits([RULES.waitlistToken(token)]);
  await track("waitlist_submit", { token, citySlug: parsed.data.city.toLowerCase().slice(0, 40) });
  return NextResponse.json({ ok: true });
}

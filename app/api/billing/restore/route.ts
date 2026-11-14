// Restore iFound+ in another browser: email a 1-hour signed link (TZ §8.6). Always answers ok — no account probing.
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { apiError, badOrigin, originOk, previewBlocked, siteUrl, userToken } from "@/lib/http";
import { RULES, recordHits, underLimits } from "@/lib/limits";
import { signLink } from "@/lib/sign";
import { sendOnce } from "@/lib/email/send";
import { subscriptionRestore } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const parsed = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("invalid_input", "Please enter a valid email.", 400);
  const token = await userToken();
  if (!(await underLimits([RULES.restoreToken(token)]))) return apiError("rate_limited", "Too many tries. Try again in an hour.", 429);
  await recordHits([RULES.restoreToken(token)]);
  const { data: sub } = await db()
    .from("subscriptions")
    .select("id, email, status")
    .ilike("email", parsed.data.email)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  if (sub) {
    const link = `${siteUrl(req)}/plus/restore/${signLink("restore", sub.id, Date.now() + 3600_000)}`;
    // Each request is its own email, so the dedupe key is unique per send.
    await sendOnce({ dedupeKey: `subscription_restore:${sub.id}:${randomUUID()}`, to: sub.email, ...subscriptionRestore({ restoreUrl: link }) });
  }
  return NextResponse.json({ ok: true });
}

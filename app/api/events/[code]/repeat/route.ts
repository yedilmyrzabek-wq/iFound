// "Run it again next week": same plan, same local time, one week later.
// Human hosts need iFound+; venue plans and demo plans are free. Past participants get "Same crew again?".
import { NextResponse, after } from "next/server";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { apiError, badOrigin, clientIp, isAdmin, originOk, previewBlocked, siteUrl, userToken } from "@/lib/http";
import { isSubscriber } from "@/lib/entitlement";
import { isDemoCode } from "@/lib/demo";
import { effectiveStatus } from "@/lib/status";
import { nowUtc } from "@/lib/tz";
import { notifyRepeat } from "@/lib/email/notify";
import { track } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const alnum = "abcdefghijklmnopqrstuvwxyz0123456789";
const code8 = customAlphabet(alnum, 8);
const code4 = customAlphabet(alnum, 4);
const NOT_REPEATABLE = "Only a plan that happened (or is on) can be run again.";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const { code } = await params;
  const token = await userToken();
  const { data: ev } = await db()
    .from("events")
    .select("id, city_slug, host_token, venue_claim_id, is_demo, status, cancel_reason, starts_at, duration_minutes")
    .eq("code", code)
    .maybeSingle();
  if (!ev) return apiError("not_found", "This plan doesn't exist.", 404);

  const demo = ev.is_demo && isDemoCode(code);
  const admin = await isAdmin();
  if (ev.host_token !== token && !demo && !admin) return apiError("forbidden", "Only the host can run this plan again.", 403);

  const eff = effectiveStatus(
    { status: ev.status, cancelReason: ev.cancel_reason, startsAt: ev.starts_at, durationMinutes: ev.duration_minutes },
    nowUtc(),
  );
  if (eff.status !== "confirmed" && eff.status !== "completed") return apiError("closed", NOT_REPEATABLE, 409);

  const { data: existing } = await db().from("events").select("code").eq("repeat_of", ev.id).maybeSingle();
  if (existing) return NextResponse.json({ code: existing.code, url: `/e/${existing.code}`, existed: true });

  // iFound+ is what makes a weekly crew possible for people; places and demo plans never pay.
  if (!demo && !ev.venue_claim_id && !admin && !(await isSubscriber(token)).active) {
    await track("paywall_shown", { eventId: ev.id, citySlug: ev.city_slug, token });
    return apiError("upgrade_required", "Running a plan every week is part of iFound+ — $8/month.", 402);
  }

  let newId: string | null = null;
  let newCode = "";
  for (let i = 0; i < 3 && !newId; i++) {
    newCode = demo ? `demo${code4()}` : code8();
    const { data, error } = await db().rpc("repeat_event", { p_event_id: ev.id, p_code: newCode, p_ip: clientIp(req) });
    if (error) {
      if (error.message.includes("already_repeated")) {
        const { data: again } = await db().from("events").select("code").eq("repeat_of", ev.id).maybeSingle();
        if (again) return NextResponse.json({ code: again.code, url: `/e/${again.code}`, existed: true });
      }
      if (error.message.includes("not_repeatable")) return apiError("closed", NOT_REPEATABLE, 409);
      if (error.code === "23505" && error.message.includes("code")) continue; // short-code collision: retry
      console.error("repeat_event failed", error.message);
      return apiError("server_error", "Couldn't create next week's plan. Try again.", 500);
    }
    newId = data as string;
  }
  if (!newId) return apiError("server_error", "Couldn't create next week's plan. Try again.", 500);

  await track("repeat_created", { eventId: newId, citySlug: ev.city_slug, token, isDemo: ev.is_demo });
  const site = siteUrl(req);
  const sourceId = ev.id;
  const createdId = newId;
  after(() => notifyRepeat(sourceId, createdId, site).catch((e) => console.error("repeat email", e)));
  return NextResponse.json({ code: newCode, url: `/e/${newCode}` }, { status: 201 });
}

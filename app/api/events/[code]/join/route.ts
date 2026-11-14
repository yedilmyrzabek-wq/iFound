import { NextResponse, after } from "next/server";
import { db, firstRow } from "@/lib/db";
import { apiError, badOrigin, clientIp, isAdmin, originOk, siteUrl, userToken, previewBlocked } from "@/lib/http";
import { RULES, recordHits, underLimits } from "@/lib/limits";
import { joinSchema } from "@/lib/validation";
import { hasProfanity } from "@/lib/profanity";
import { notifyJoin } from "@/lib/email/notify";
import { track } from "@/lib/analytics";
import { getProfile, saveProfile } from "@/lib/profile";
import type { EventStatus, JoinResponse, JoinResult } from "@/lib/types";

export const dynamic = "force-dynamic";

interface JoinRow {
  r_result: JoinResult;
  r_status: EventStatus | null;
  r_count: number;
  r_participant_id: string | null;
  r_just_confirmed: boolean;
}

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const { code } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("invalid_input", "Please check the form.", 400);
  }
  const token = await userToken();
  let input: { name: string; email: string; photoPath: string | null };
  if ((body as { useSavedProfile?: unknown })?.useSavedProfile === true) {
    // One-tap join from the swipe deck: 18+ was already confirmed in the form that saved this profile.
    const saved = await getProfile(token);
    if (!saved) return apiError("profile_required", "Tell us your name and email first.", 400);
    input = saved;
  } else {
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Please check the form.", 400);
    input = parsed.data;
    if (hasProfanity(input.name)) return apiError("invalid_input", "Please use your real first name.", 400);
  }

  const ip = clientIp(req);
  const admin = await isAdmin();
  const rules = [RULES.joinToken(token), ip ? RULES.joinIp(ip) : null];
  if (!admin && !(await underLimits(rules))) {
    return apiError("rate_limited", "Too many joins in a short time. Try again in a bit.", 429);
  }

  const { data: ev } = await db()
    .from("events")
    .select("id, min_people, max_people, city_slug, is_demo")
    .eq("code", code)
    .maybeSingle();
  if (!ev) return apiError("not_found", "This plan doesn't exist or was removed.", 404);

  // All threshold logic lives in join_event (SELECT … FOR UPDATE). TypeScript only reacts to its answer.
  const { data, error } = await db().rpc("join_event", {
    p_event_id: ev.id,
    p_user_token: token,
    p_name: input.name,
    p_email: input.email,
    p_photo_path: input.photoPath,
    p_ip: ip,
  });
  if (error) {
    console.error("join_event failed", error.message);
    // A unique-index race on (event, token/email) surfaces as 23505 — same meaning as already_joined.
    if (error.code === "23505") return apiError("already_joined", "You're already in this plan.", 409);
    return apiError("server_error", "Something went wrong. Please try again.", 500);
  }
  const row = firstRow<JoinRow>(data);
  if (!row) return apiError("server_error", "Something went wrong. Please try again.", 500);

  switch (row.r_result) {
    case "not_found":
      return apiError("not_found", "This plan doesn't exist or was removed.", 404);
    case "closed":
      return apiError("closed", "This plan isn't taking new people anymore.", 410);
    case "full":
      return apiError("full", "This plan is full.", 409);
    case "already_joined":
      return apiError("already_joined", "You're already in this plan (or someone with this email is).", 409);
  }

  if (!admin) await recordHits(rules);
  await track("join_success", { eventId: ev.id, citySlug: ev.city_slug, token, isDemo: ev.is_demo });
  if (row.r_just_confirmed) await track("event_confirmed", { eventId: ev.id, citySlug: ev.city_slug, token, isDemo: ev.is_demo });
  await saveProfile(token, input).catch((e) => console.error("profile save", e));

  const site = siteUrl(req);
  const participantId = row.r_participant_id!;
  // Only the request that received r_just_confirmed = true sends "It's on"; email_log makes it exactly-once.
  after(() =>
    notifyJoin(ev.id, participantId, row.r_just_confirmed, row.r_status ?? "filling", site).catch((e) =>
      console.error("join email", e),
    ),
  );

  const res: JoinResponse = {
    result: "joined",
    status: row.r_status ?? "filling",
    count: row.r_count,
    minPeople: ev.min_people,
    maxPeople: ev.max_people,
    justConfirmed: row.r_just_confirmed,
  };
  return NextResponse.json(res);
}

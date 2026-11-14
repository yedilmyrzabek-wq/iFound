import { NextResponse, after } from "next/server";
import { customAlphabet } from "nanoid";
import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getCity, listEvents } from "@/lib/events";
import { apiError, badOrigin, clientIp, isAdmin, originOk, siteUrl, userToken, previewBlocked } from "@/lib/http";
import { RULES, ownPlansLast30Days, recordHits, underLimits } from "@/lib/limits";
import { isSubscriber } from "@/lib/entitlement";
import { createEventSchema } from "@/lib/validation";
import { cityLocalToUtc, nowUtc } from "@/lib/tz";
import { activityLabel } from "@/lib/activities";
import { hasProfanity } from "@/lib/profanity";
import { notifyHostCreated } from "@/lib/email/notify";
import { saveProfile } from "@/lib/profile";
import { ACTIVITIES, type Activity, type DayFilter } from "@/lib/types";

export const dynamic = "force-dynamic";

const newCode = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const city = await getCity(url.searchParams.get("city") ?? "");
  if (!city) return apiError("not_found", "We don't know that city yet.", 404);
  const dayParam = url.searchParams.get("day") ?? "all";
  const day: DayFilter = (["today", "tomorrow", "weekend", "week", "all"] as readonly string[]).includes(dayParam)
    ? (dayParam as DayFilter)
    : "all";
  const activities = (url.searchParams.get("activity") ?? "")
    .split(",")
    .filter((a): a is Activity => (ACTIVITIES as readonly string[]).includes(a));
  const events = await listEvents(city.slug, city.timezone, day, activities);
  return NextResponse.json({ events }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("invalid_input", "That didn't look like a valid plan.", 400);
  }
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError("invalid_input", first?.message ?? "Please check the form.", 400);
  }
  const input = parsed.data;

  const city = await getCity(input.city);
  if (!city) return apiError("invalid_input", "Pick one of our cities.", 400);

  // 2. The typed time is the CITY's local time — not the server's, not the browser's.
  const startsAt = cityLocalToUtc(input.startsAtLocal, city.timezone);
  if (!startsAt) return apiError("invalid_input", "Pick a date and time.", 400);
  const start = DateTime.fromISO(startsAt);
  const now = DateTime.fromISO(nowUtc());
  if (start < now.plus({ hours: 3 })) return apiError("starts_at_out_of_range", "Pick a time at least 3 hours from now.", 400);
  if (start > now.plus({ days: 30 })) return apiError("starts_at_out_of_range", "Pick a date within the next 30 days.", 400);
  if (start.setZone(city.timezone).minute % 15 !== 0) return apiError("invalid_input", "Pick a time in 15-minute steps.", 400);

  let venue: { id: string; name: string } | null = null;
  if (input.venueId) {
    const { data } = await db().from("venues").select("id, name, city_slug").eq("id", input.venueId).maybeSingle();
    if (!data || data.city_slug !== city.slug) return apiError("invalid_input", "That place isn't in this city.", 400);
    venue = { id: data.id, name: data.name };
  }

  const activityOther = input.activity === "other" ? input.activityOther : null;
  const placeName = venue ? null : input.place!.name;
  if (hasProfanity(input.title, input.description, input.host.name, placeName, activityOther)) {
    return apiError("invalid_input", "Please keep it friendly — some words aren't allowed.", 400);
  }

  const token = await userToken();
  const ip = clientIp(req);
  const admin = await isAdmin();
  const asVenue = input.asVenue.enabled && !!venue;

  // 4. Limits. Soft IP limit, real limit by token. Admin bypasses all.
  if (!admin) {
    const rules = [RULES.createToken(token), ip ? RULES.createIp(ip) : null];
    if (!(await underLimits(rules))) {
      return apiError("rate_limited", "You've started a lot of plans today. Try again tomorrow.", 429);
    }
    if (!asVenue) {
      const used = await ownPlansLast30Days(token, input.host.email);
      if (used >= 1 && !(await isSubscriber(token)).active) {
        return apiError("upgrade_required", "Free includes 1 plan a month. Get iFound+ for unlimited plans — $8/month.", 402);
      }
    }
  }

  // 5. Venue claim — never blocks publishing. The ✓ badge appears only after the email link is confirmed.
  let claimId: string | null = null;
  if (asVenue && venue && input.asVenue.email) {
    const { data: existing } = await db()
      .from("venue_claims")
      .select("id")
      .eq("venue_id", venue.id)
      .ilike("email", input.asVenue.email)
      .order("verified_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      claimId = existing.id;
    } else {
      const { data: created, error } = await db()
        .from("venue_claims")
        .insert({ venue_id: venue.id, email: input.asVenue.email, claim_token: randomUUID() })
        .select("id")
        .single();
      if (error) throw error;
      claimId = created.id;
      // The venue_verify email (signed /v/verify link) goes out with the host email below.
    }
  }

  const title =
    input.title || `${activityLabel(input.activity, activityOther)} at ${venue ? venue.name : placeName}`;

  // 6. create_event — retry on the (rare) short-code collision.
  let eventId: string | null = null;
  let code = "";
  for (let attempt = 0; attempt < 3 && !eventId; attempt++) {
    code = newCode();
    const { data, error } = await db().rpc("create_event", {
      p_code: code,
      p_city: city.slug,
      p_venue_id: venue?.id ?? null,
      p_place_name: placeName,
      p_place_lat: venue ? null : input.place!.lat,
      p_place_lng: venue ? null : input.place!.lng,
      p_activity: input.activity,
      p_activity_other: activityOther,
      p_title: title,
      p_description: input.description || null,
      p_starts_at: startsAt,
      p_duration: input.durationMinutes,
      p_min: input.minPeople,
      p_max: input.maxPeople,
      p_host_token: token,
      p_host_name: input.host.name,
      p_host_email: asVenue ? input.asVenue.email : input.host.email,
      p_host_photo: input.host.photoPath,
      p_venue_claim_id: claimId,
      p_is_demo: false,
      p_ip: ip,
    });
    if (error) {
      if (error.message.includes("starts_at_out_of_range")) {
        return apiError("starts_at_out_of_range", "Pick a time between 3 hours and 30 days from now.", 400);
      }
      if (error.code === "23505" && error.message.includes("code")) continue;
      console.error("create_event failed", error.message);
      return apiError("server_error", "Something went wrong. Please try again.", 500);
    }
    eventId = data as string;
  }
  if (!eventId) return apiError("server_error", "Something went wrong. Please try again.", 500);

  if (!admin) await recordHits([RULES.createToken(token), ip ? RULES.createIp(ip) : null]);
  if (!asVenue) {
    await saveProfile(token, { name: input.host.name, email: input.host.email, photoPath: input.host.photoPath }).catch((e) =>
      console.error("profile save", e),
    );
  }

  const site = siteUrl(req);
  const hostEmail = asVenue ? input.asVenue.email! : input.host.email;
  after(() => notifyHostCreated(eventId!, hostEmail, site).catch((e) => console.error("host email", e)));

  return NextResponse.json({ code, url: `/e/${code}` }, { status: 201 });
}

// "My plans" for a browser token: going / hosting / past, plus subscription status.
import "server-only";
import { DateTime } from "luxon";
import { db } from "./db";
import { isSubscriber } from "./entitlement";
import { getEventRow } from "./events";
import { nowUtc } from "./tz";
import { effectiveStatus } from "./status";
import type { EventSummary } from "./types";
import { previewMode } from "./preview";

export interface MyPlan extends EventSummary {
  timezone: string;
  role: "host" | "participant";
}

export async function getMyPlans(token: string) {
  if (previewMode()) return { going: [], hosting: [], past: [], plus: { active: false, until: null } };
  const now = nowUtc();
  const [asParticipant, asHost, plus] = await Promise.all([
    db().from("participants").select("event_id, events(code)").eq("user_token", token).is("left_at", null),
    db().from("events").select("code").eq("host_token", token),
    isSubscriber(token),
  ]);
  const codes = new Set<string>();
  for (const r of (asParticipant.data ?? []) as unknown as { events: { code: string } | null }[]) if (r.events) codes.add(r.events.code);
  const hostCodes = new Set((asHost.data ?? []).map((r) => r.code as string));
  for (const c of hostCodes) codes.add(c);

  const rows = (await Promise.all([...codes].map((c) => getEventRow(c)))).filter((r) => r && !r.hidden);
  const plans: MyPlan[] = rows.map((r) => {
    const eff = effectiveStatus(
      { status: r!.status, cancelReason: r!.cancel_reason, startsAt: r!.starts_at, durationMinutes: r!.duration_minutes },
      now,
    );
    return {
      code: r!.code,
      citySlug: r!.city_slug,
      title: r!.title,
      activity: r!.activity,
      activityOther: r!.activity_other,
      startsAt: DateTime.fromISO(r!.starts_at, { zone: "utc" }).toUTC().toISO()!,
      durationMinutes: r!.duration_minutes,
      minPeople: r!.min_people,
      maxPeople: r!.max_people,
      count: r!.participant_count,
      status: eff.status,
      cancelReason: eff.cancelReason,
      isFull: r!.participant_count >= r!.max_people,
      isDemo: r!.is_demo,
      place: r!.venue
        ? { name: r!.venue.name, address: r!.venue.address, lat: r!.venue.lat, lng: r!.venue.lng, venueId: r!.venue.id }
        : { name: r!.place_name ?? "", address: null, lat: r!.place_lat ?? 0, lng: r!.place_lng ?? 0, venueId: null },
      hostVenueName: null,
      timezone: r!.city?.timezone ?? "America/Chicago",
      role: hostCodes.has(r!.code) ? "host" : "participant",
    };
  });
  const open = (p: MyPlan) => p.status === "filling" || p.status === "confirmed";
  const byTime = (a: MyPlan, b: MyPlan) => a.startsAt.localeCompare(b.startsAt);
  return {
    going: plans.filter((p) => open(p) && p.role === "participant").sort(byTime),
    hosting: plans.filter((p) => open(p) && p.role === "host").sort(byTime),
    past: plans.filter((p) => !open(p)).sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    plus,
  };
}

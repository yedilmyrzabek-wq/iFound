// Read side for plans: maps DB rows to API shapes, applies effective status and visibility rules.
// Participant emails and tokens are never selected into anything that leaves this module.
import "server-only";
import { DateTime } from "luxon";
import { db } from "./db";
import { dayRange, nowUtc } from "./tz";
import { effectiveStatus, fillDeadline, isJoinOpen } from "./status";
import { isSubscriber, signedPhotoUrls } from "./entitlement";
import { PREVIEW_CITIES, previewEvent, previewEvents, previewMode, previewVenues } from "./preview";
import type { Activity, CancelReason, City, DayFilter, EventDetail, EventStatus, EventSummary, Venue, VenueCategory } from "./types";

const EVENT_COLUMNS = `
  id, code, city_slug, venue_id, place_name, place_lat, place_lng, activity, activity_other,
  title, description, starts_at, duration_minutes, min_people, max_people, status,
  participant_count, cancel_reason, is_demo, hidden, host_token, venue_claim_id,
  venue:venues!events_venue_id_fkey ( id, name, address, lat, lng ),
  claim:venue_claims!events_venue_claim_id_fkey ( verified_at ),
  city:cities!events_city_slug_fkey ( name, timezone )
`;

interface EventRow {
  id: string;
  code: string;
  city_slug: string;
  venue_id: string | null;
  place_name: string | null;
  place_lat: number | null;
  place_lng: number | null;
  activity: Activity;
  activity_other: string | null;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  min_people: number;
  max_people: number;
  status: EventStatus;
  participant_count: number;
  cancel_reason: CancelReason | null;
  is_demo: boolean;
  hidden: boolean;
  host_token: string;
  venue_claim_id: string | null;
  venue: { id: string; name: string; address: string | null; lat: number; lng: number } | null;
  claim: { verified_at: string | null } | null;
  city: { name: string; timezone: string } | null;
}

function toSummary(r: EventRow, nowIso: string): EventSummary {
  const eff = effectiveStatus(
    { status: r.status, cancelReason: r.cancel_reason, startsAt: r.starts_at, durationMinutes: r.duration_minutes },
    nowIso,
  );
  return {
    code: r.code,
    citySlug: r.city_slug,
    title: r.title,
    activity: r.activity,
    activityOther: r.activity_other,
    startsAt: DateTime.fromISO(r.starts_at, { zone: "utc" }).toUTC().toISO()!,
    durationMinutes: r.duration_minutes,
    minPeople: r.min_people,
    maxPeople: r.max_people,
    count: r.participant_count,
    status: eff.status,
    cancelReason: eff.cancelReason,
    isFull: r.participant_count >= r.max_people,
    isDemo: r.is_demo,
    place: r.venue
      ? { name: r.venue.name, address: r.venue.address, lat: r.venue.lat, lng: r.venue.lng, venueId: r.venue.id }
      : { name: r.place_name ?? "", address: null, lat: r.place_lat ?? 0, lng: r.place_lng ?? 0, venueId: null },
    hostVenueName: r.venue_claim_id && r.claim?.verified_at && r.venue ? r.venue.name : null,
  };
}

export async function listCities(): Promise<City[]> {
  if (previewMode()) return PREVIEW_CITIES.map((c) => ({ ...c, openCount: previewEvents(c.slug).length }));
  const now = nowUtc();
  const [cities, events] = await Promise.all([
    db().from("cities").select("*").order("sort_order"),
    db()
      .from("events")
      .select("city_slug, status, starts_at, duration_minutes, cancel_reason")
      .eq("hidden", false)
      .in("status", ["filling", "confirmed"])
      .gt("starts_at", now),
  ]);
  if (cities.error) throw cities.error;
  if (events.error) throw events.error;
  const counts = new Map<string, number>();
  for (const e of events.data ?? []) {
    const eff = effectiveStatus(
      { status: e.status, cancelReason: e.cancel_reason, startsAt: e.starts_at, durationMinutes: e.duration_minutes },
      now,
    );
    if (eff.status === "filling" || eff.status === "confirmed") counts.set(e.city_slug, (counts.get(e.city_slug) ?? 0) + 1);
  }
  return (cities.data ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    timezone: c.timezone,
    centerLat: c.center_lat,
    centerLng: c.center_lng,
    defaultZoom: c.default_zoom,
    openCount: counts.get(c.slug) ?? 0,
  }));
}

export async function getCity(slug: string): Promise<Omit<City, "openCount"> | null> {
  if (previewMode()) return PREVIEW_CITIES.find((c) => c.slug === slug) ?? null;
  const { data, error } = await db().from("cities").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    slug: data.slug,
    name: data.name,
    timezone: data.timezone,
    centerLat: data.center_lat,
    centerLng: data.center_lng,
    defaultZoom: data.default_zoom,
  };
}

export async function listVenues(citySlug: string): Promise<Venue[]> {
  if (previewMode()) return previewVenues(citySlug);
  const { data, error } = await db()
    .from("venues")
    .select("id, city_slug, name, address, category, lat, lng")
    .eq("city_slug", citySlug)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((v) => ({
    id: v.id,
    citySlug: v.city_slug,
    name: v.name,
    address: v.address,
    category: v.category as VenueCategory,
    lat: v.lat,
    lng: v.lng,
  }));
}

/** Open (filling/confirmed), not hidden, ascending by time, day filter computed in the city's zone. */
export async function listEvents(
  citySlug: string,
  timezone: string,
  day: DayFilter,
  activities: Activity[],
): Promise<EventSummary[]> {
  const now = nowUtc();
  const range = dayRange(day, timezone, now);
  if (previewMode()) {
    return previewEvents(citySlug).filter(
      (e) => e.startsAt >= range.from && (!range.to || e.startsAt < range.to) && (!activities.length || activities.includes(e.activity)),
    );
  }
  let q = db()
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("city_slug", citySlug)
    .eq("hidden", false)
    .in("status", ["filling", "confirmed"])
    .gte("starts_at", range.from)
    .order("starts_at", { ascending: true })
    .limit(200);
  if (range.to) q = q.lt("starts_at", range.to);
  if (activities.length) q = q.in("activity", activities);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown as EventRow[])
    .map((r) => toSummary(r, now))
    .filter((e) => e.status === "filling" || e.status === "confirmed");
}

export async function getEventRow(code: string): Promise<EventRow | null> {
  if (previewMode()) return null;
  const { data, error } = await db().from("events").select(EVENT_COLUMNS).eq("code", code).maybeSingle();
  if (error) throw error;
  return (data as unknown as EventRow) ?? null;
}

/** Full plan view for one viewer. Guests get no participant names or photos — not hidden, not sent. */
export async function getEventDetail(code: string, viewerToken: string): Promise<EventDetail | null> {
  if (previewMode()) return previewEvent(code);
  const row = await getEventRow(code);
  if (!row || row.hidden) return null;
  const now = nowUtc();
  const summary = toSummary(row, now);

  const { data: people, error } = await db()
    .from("participants")
    .select("id, display_name, photo_path, photo_hidden, is_host, user_token, joined_at")
    .eq("event_id", row.id)
    .is("left_at", null)
    .order("joined_at", { ascending: true });
  if (error) throw error;

  const isHost = row.host_token === viewerToken;
  const isParticipant = (people ?? []).some((p) => p.user_token === viewerToken);
  const role = isHost ? "host" : isParticipant ? "participant" : "guest";
  const canSeeParticipants = role !== "guest" || (await isSubscriber(viewerToken)).active;

  const hostPerson = row.venue_claim_id ? null : (people ?? []).find((p) => p.is_host) ?? null;
  const visiblePhotos = (people ?? [])
    .filter((p) => p.photo_path && !p.photo_hidden && (canSeeParticipants || p.is_host))
    .map((p) => p.photo_path as string);
  const urls = await signedPhotoUrls(visiblePhotos);
  const photoOf = (p: { photo_path: string | null; photo_hidden: boolean }) =>
    p.photo_path && !p.photo_hidden ? urls.get(p.photo_path) ?? null : null;

  return {
    ...summary,
    description: row.description,
    timezone: row.city?.timezone ?? "America/Chicago",
    cityName: row.city?.name ?? row.city_slug,
    fillDeadline: fillDeadline(summary.startsAt),
    host: hostPerson ? { name: hostPerson.display_name, photoUrl: photoOf(hostPerson) } : null,
    viewer: {
      role,
      canSeeParticipants,
      canJoin: role === "guest" && isJoinOpen(summary.status, summary.startsAt, summary.count, summary.maxPeople, now),
    },
    participants: canSeeParticipants
      ? (people ?? []).map((p) => ({ id: p.id, name: p.display_name, photoUrl: photoOf(p), isHost: p.is_host }))
      : null,
  };
}

/**
 * Swipe deck (TZ §8.12): open plans with seats where the viewer isn't in and isn't host,
 * ordered by "fewest people missing" first, then confirmed-with-room by time. `first` pins one plan on top.
 */
export async function getDeck(
  citySlug: string,
  timezone: string,
  day: DayFilter,
  viewerToken: string,
  first: string | null,
  cursor: number,
  pageSize = 10,
): Promise<{ cards: (EventSummary & { timezone: string; host: { name: string; photoUrl: string | null } | null })[]; nextCursor: number | null }> {
  const now = nowUtc();
  const range = dayRange(day, timezone, now);
  let rows: EventRow[];
  if (previewMode()) {
    rows = [];
  } else {
    let q = db()
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("city_slug", citySlug)
      .eq("hidden", false)
      .in("status", ["filling", "confirmed"])
      .gte("starts_at", range.from)
      .order("starts_at", { ascending: true })
      .limit(300);
    if (range.to) q = q.lt("starts_at", range.to);
    const { data, error } = await q;
    if (error) throw error;
    rows = (data ?? []) as unknown as EventRow[];
    if (first && !rows.some((r) => r.code === first)) {
      const pinned = await getEventRow(first);
      if (pinned && pinned.city_slug === citySlug && !pinned.hidden) rows.push(pinned);
    }
  }

  const ids = rows.map((r) => r.id);
  const mine = new Set<string>();
  const hosts = new Map<string, string>();
  if (ids.length) {
    const [{ data: myRows }, { data: hostRows }] = await Promise.all([
      db().from("participants").select("event_id").in("event_id", ids).eq("user_token", viewerToken).is("left_at", null),
      db().from("participants").select("event_id, display_name").in("event_id", ids).eq("is_host", true).is("left_at", null),
    ]);
    for (const r of myRows ?? []) mine.add(r.event_id);
    for (const r of hostRows ?? []) hosts.set(r.event_id, r.display_name);
  }

  const eligible = rows
    .filter((r) => r.host_token !== viewerToken && !mine.has(r.id))
    .map((r) => ({ row: r, s: toSummary(r, now) }))
    .filter(({ s }) => isJoinOpen(s.status, s.startsAt, s.count, s.maxPeople, now));

  const filling = eligible
    .filter(({ s }) => s.status === "filling")
    .sort((a, b) => a.s.minPeople - a.s.count - (b.s.minPeople - b.s.count) || a.s.startsAt.localeCompare(b.s.startsAt));
  const confirmed = eligible.filter(({ s }) => s.status === "confirmed").sort((a, b) => a.s.startsAt.localeCompare(b.s.startsAt));
  let ordered = [...filling, ...confirmed];
  if (first) {
    const i = ordered.findIndex(({ s }) => s.code === first);
    if (i > 0) ordered = [ordered[i], ...ordered.slice(0, i), ...ordered.slice(i + 1)];
  }

  const page = ordered.slice(cursor, cursor + pageSize);
  return {
    cards: page.map(({ row, s }) => ({
      ...s,
      timezone: row.city?.timezone ?? timezone,
      host: row.venue_claim_id ? null : hosts.has(row.id) ? { name: hosts.get(row.id)!, photoUrl: null } : null,
    })),
    nextCursor: cursor + pageSize < ordered.length ? cursor + pageSize : null,
  };
}

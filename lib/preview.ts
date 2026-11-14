// LOCAL PREVIEW ONLY. When Supabase isn't configured and we're not in production, pages render
// fixture plans so the UI can be looked at. Never active in production; every page shows a banner.
// Joining/creating are disabled in this mode — the real logic lives only in Postgres.
import "server-only";
import { createHash } from "node:crypto";
import { DateTime } from "luxon";
import austin from "@/data/venues/austin.json";
import newYork from "@/data/venues/new-york.json";
import chicago from "@/data/venues/chicago.json";
import denver from "@/data/venues/denver.json";
import seattle from "@/data/venues/seattle.json";
import type { City, EventDetail, EventSummary, Venue, VenueCategory } from "./types";

export function previewMode(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.SUPABASE_URL;
}

const uuid = (s: string) => {
  const h = createHash("md5").update(s).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

export const PREVIEW_CITIES: Omit<City, "openCount">[] = [
  { slug: "austin", name: "Austin, TX", timezone: "America/Chicago", centerLat: 30.2672, centerLng: -97.7431, defaultZoom: 13 },
  { slug: "new-york", name: "New York, NY", timezone: "America/New_York", centerLat: 40.7128, centerLng: -74.006, defaultZoom: 13 },
  { slug: "chicago", name: "Chicago, IL", timezone: "America/Chicago", centerLat: 41.8781, centerLng: -87.6298, defaultZoom: 13 },
  { slug: "denver", name: "Denver, CO", timezone: "America/Denver", centerLat: 39.7392, centerLng: -104.9903, defaultZoom: 13 },
  { slug: "seattle", name: "Seattle, WA", timezone: "America/Los_Angeles", centerLat: 47.6062, centerLng: -122.3321, defaultZoom: 13 },
];

type Raw = { osm_ref: string; name: string; address: string | null; category: string; lat: number; lng: number };
const RAW: Record<string, Raw[]> = { austin, "new-york": newYork, chicago, denver, seattle };

export function previewVenues(city: string): Venue[] {
  return (RAW[city] ?? []).map((v) => ({
    id: uuid(v.osm_ref),
    citySlug: city,
    name: v.name,
    address: v.address,
    category: v.category as VenueCategory,
    lat: v.lat,
    lng: v.lng,
  }));
}

function byName(name: string) {
  const v = previewVenues("austin").find((x) => x.name.startsWith(name));
  if (!v) throw new Error(`preview venue ${name} missing`);
  return v;
}

/** Fixture plans relative to "now", in Austin time, so every state can be looked at. */
function fixtures(): EventDetail[] {
  const tz = "America/Chicago";
  const today = DateTime.now().setZone(tz).startOf("day");
  const at = (days: number, h: number, m = 0) => today.plus({ days, hours: h, minutes: m }).toUTC().toISO({ suppressMilliseconds: true })!;
  const mk = (
    code: string,
    venueName: string,
    p: Partial<EventDetail> & Pick<EventDetail, "title" | "activity" | "startsAt" | "minPeople" | "maxPeople" | "count" | "status">,
    host: string,
  ): EventDetail => {
    const v = byName(venueName);
    return {
      code,
      citySlug: "austin",
      activityOther: null,
      durationMinutes: 120,
      cancelReason: null,
      isFull: p.count >= p.maxPeople,
      isDemo: true,
      place: { name: v.name, address: v.address, lat: v.lat, lng: v.lng, venueId: v.id },
      hostVenueName: null,
      description: null,
      timezone: tz,
      cityName: "Austin, TX",
      fillDeadline: DateTime.fromISO(p.startsAt).minus({ hours: 2 }).toUTC().toISO({ suppressMilliseconds: true })!,
      host: { name: host, photoUrl: null },
      viewer: { role: "guest", canSeeParticipants: false, canJoin: p.status === "filling" || (p.status === "confirmed" && p.count < p.maxPeople) },
      participants: null,
      repeatCode: null,
      repeatOfCode: null,
      ...p,
    };
  };
  return [
    mk("prevbg01", "Cherrywood", { title: "Board games at Cherrywood Coffee House", activity: "board_games", startsAt: at(1, 19), minPeople: 6, maxPeople: 12, count: 4, status: "filling", description: "Bringing Catan and Codenames. Beginners welcome!" }, "Alex"),
    mk("prevrn02", "Waterloo Park", { title: "Sunset run at Waterloo Park", activity: "run", startsAt: at(2, 18, 30), minPeople: 4, maxPeople: 10, count: 5, status: "confirmed", durationMinutes: 60 }, "Jordan"),
    mk("prevsc03", "St. Edward", { title: "Pickup soccer at St. Edward's", activity: "soccer", startsAt: at(3, 10), minPeople: 10, maxPeople: 14, count: 3, status: "filling" }, "Sam"),
    mk("prevmv04", "AFS Cinema", { title: "Movie at AFS Cinema", activity: "movie", startsAt: at(4, 20), minPeople: 3, maxPeople: 3, count: 3, status: "confirmed" }, "Priya"),
    mk("prevcf05", "Houndstooth", { title: "Coffee at Houndstooth", activity: "coffee", startsAt: at(5, 9), minPeople: 3, maxPeople: 6, count: 1, status: "filling" }, "Taylor"),
  ];
}

export function previewEvents(city: string): EventSummary[] {
  if (city !== "austin") return [];
  return fixtures().map(({ description, timezone, cityName, fillDeadline, host, viewer, participants, ...s }) => {
    void description; void timezone; void cityName; void fillDeadline; void host; void viewer; void participants;
    return s;
  });
}

export function previewEvent(code: string): EventDetail | null {
  return fixtures().find((e) => e.code === code) ?? null;
}

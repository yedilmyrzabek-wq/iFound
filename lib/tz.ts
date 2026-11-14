// Everything about time zones. Every displayed time goes through here (TZ §6).
// Rule: times are shown in the CITY's zone with a label. Never use bare `new Date()` for display or filters.
import { DateTime } from "luxon";
import type { DayFilter } from "./types";

const LOCALE = "en-US";

/** "CT", "ET", "MT", "PT" for US zones; falls back to Luxon's short offset name. */
export function zoneAbbr(timezone: string): string {
  const map: Record<string, string> = {
    "America/Chicago": "CT",
    "America/New_York": "ET",
    "America/Denver": "MT",
    "America/Los_Angeles": "PT",
  };
  return map[timezone] ?? DateTime.now().setZone(timezone).toFormat("ZZZZ");
}

/** "Central Time" etc. — used for the label next to the /new time field. */
export function zoneLongName(timezone: string): string {
  const map: Record<string, string> = {
    "America/Chicago": "Central Time",
    "America/New_York": "Eastern Time",
    "America/Denver": "Mountain Time",
    "America/Los_Angeles": "Pacific Time",
  };
  return map[timezone] ?? timezone;
}

function inZone(iso: string, timezone: string): DateTime {
  return DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone).setLocale(LOCALE);
}

/** "Thu, Nov 20 · 7:00 PM CT" */
export function formatShort(iso: string, timezone: string): string {
  const d = inZone(iso, timezone);
  return `${d.toFormat("ccc, LLL d")} · ${d.toFormat("h:mm a")} ${zoneAbbr(timezone)}`;
}

/** "Thu 7:00 PM" — for cards, where the city header already says the zone. */
export function formatCard(iso: string, timezone: string): string {
  return inZone(iso, timezone).toFormat("ccc h:mm a");
}

/** "Thu 5:00 PM CT" */
export function formatDeadline(iso: string, timezone: string): string {
  return `${inZone(iso, timezone).toFormat("ccc h:mm a")} ${zoneAbbr(timezone)}`;
}

/** "Thursday, Nov 20 · 7:00–9:00 PM CT" */
export function formatRange(iso: string, durationMinutes: number, timezone: string): string {
  const s = inZone(iso, timezone);
  const e = s.plus({ minutes: durationMinutes });
  const sameMeridiem = s.toFormat("a") === e.toFormat("a");
  const start = sameMeridiem ? s.toFormat("h:mm") : s.toFormat("h:mm a");
  return `${s.toFormat("cccc, LLL d")} · ${start}–${e.toFormat("h:mm a")} ${zoneAbbr(timezone)}`;
}

/** "in 5 h", "in 2 days", "in 40 min", "2 h ago". `nowIso` lets server and client agree. */
export function formatRelative(iso: string, nowIso: string): string {
  const diffMin = Math.round(
    DateTime.fromISO(iso, { zone: "utc" }).diff(DateTime.fromISO(nowIso, { zone: "utc" }), "minutes").minutes,
  );
  const abs = Math.abs(diffMin);
  let s: string;
  if (abs < 60) s = `${abs} min`;
  else if (abs < 48 * 60) s = `${Math.round(abs / 60)} h`;
  else s = `${Math.round(abs / 1440)} days`;
  return diffMin >= 0 ? `in ${s}` : `${s} ago`;
}

/**
 * "That's 6:00 AM Fri in your time" — or null if the viewer's zone matches the city's.
 * Client-only: call it after mount, never during SSR.
 */
export function formatViewerLocal(iso: string, cityTimezone: string, viewerTimezone: string): string | null {
  const city = inZone(iso, cityTimezone);
  const viewer = inZone(iso, viewerTimezone);
  if (city.offset === viewer.offset) return null;
  return `That's ${viewer.toFormat("h:mm a ccc")} in your time`;
}

/** Converts "YYYY-MM-DDTHH:mm" typed by the user, interpreted in the CITY's zone, to an ISO UTC string. */
export function cityLocalToUtc(local: string, timezone: string): string | null {
  const d = DateTime.fromISO(local, { zone: timezone });
  if (!d.isValid) return null;
  return d.toUTC().toISO({ suppressMilliseconds: true });
}

/** Inverse of cityLocalToUtc, for prefilling forms. */
export function utcToCityLocal(iso: string, timezone: string): string {
  return inZone(iso, timezone).toFormat("yyyy-LL-dd'T'HH:mm");
}

/** [start, end) UTC range of a day filter, computed in the city's zone. null = no bound. */
export function dayRange(filter: DayFilter, timezone: string, nowIso: string): { from: string; to: string | null } {
  const now = DateTime.fromISO(nowIso, { zone: "utc" }).setZone(timezone);
  const today = now.startOf("day");
  const iso = (d: DateTime) => d.toUTC().toISO({ suppressMilliseconds: true })!;
  switch (filter) {
    case "today":
      return { from: iso(now), to: iso(today.plus({ days: 1 })) };
    case "tomorrow":
      return { from: iso(today.plus({ days: 1 })), to: iso(today.plus({ days: 2 })) };
    case "weekend": {
      // Luxon weekday: 1 = Mon … 7 = Sun. On Sat/Sun "this weekend" is the current one.
      const wd = now.weekday;
      const sat = wd >= 6 ? today.minus({ days: wd - 6 }) : today.plus({ days: 6 - wd });
      const from = sat < now ? now : sat;
      return { from: iso(from), to: iso(sat.plus({ days: 2 })) };
    }
    default:
      return { from: iso(now), to: null };
  }
}

/** Bounds for the /new form: earliest = now + 3h, latest = now + 30 days, both in city-local form. */
export function createBounds(timezone: string, nowIso: string): { min: string; max: string } {
  const now = DateTime.fromISO(nowIso, { zone: "utc" }).setZone(timezone);
  const min = now.plus({ hours: 3 });
  const roundedMin = min.plus({ minutes: (15 - (min.minute % 15)) % 15 }).startOf("minute");
  return {
    min: roundedMin.toFormat("yyyy-LL-dd'T'HH:mm"),
    max: now.plus({ days: 30 }).toFormat("yyyy-LL-dd'T'HH:mm"),
  };
}

/** Current time as ISO UTC. The single sanctioned "now". */
export function nowUtc(): string {
  return DateTime.utc().toISO({ suppressMilliseconds: true })!;
}

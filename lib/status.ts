// Effective status on read (TZ §6): if the sweep cron is late, the UI still shows the truth.
// This never writes — the DB functions remain the only place that changes status.
import { DateTime } from "luxon";
import type { CancelReason, EventStatus } from "./types";

export interface StatusInput {
  status: EventStatus;
  cancelReason: CancelReason | null;
  startsAt: string;
  durationMinutes: number;
}

export function fillDeadline(startsAt: string): string {
  return DateTime.fromISO(startsAt, { zone: "utc" }).minus({ hours: 2 }).toISO({ suppressMilliseconds: true })!;
}

export function effectiveStatus(e: StatusInput, nowIso: string): { status: EventStatus; cancelReason: CancelReason | null } {
  const now = DateTime.fromISO(nowIso, { zone: "utc" });
  const start = DateTime.fromISO(e.startsAt, { zone: "utc" });
  if (e.status === "filling" && now >= start.minus({ hours: 2 })) {
    return { status: "cancelled", cancelReason: "unfilled" };
  }
  if (e.status === "confirmed" && now >= start.plus({ minutes: e.durationMinutes })) {
    return { status: "completed", cancelReason: null };
  }
  return { status: e.status, cancelReason: e.cancelReason };
}

/** True if a new person could join right now (mirrors join_event's checks; the DB stays authoritative). */
export function isJoinOpen(status: EventStatus, startsAt: string, count: number, max: number, nowIso: string): boolean {
  if (status !== "filling" && status !== "confirmed") return false;
  if (DateTime.fromISO(nowIso) >= DateTime.fromISO(startsAt)) return false;
  return count < max;
}

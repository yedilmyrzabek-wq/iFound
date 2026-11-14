// Funnel analytics (TZ §18). Facts are recorded server-side right where they happen; views and clicks come from
// /api/track. Demo plans are never counted. A failure here must never break the request that tracked it.
import "server-only";
import { db } from "./db";

export const CLIENT_EVENTS = [
  "landing_view",
  "city_view",
  "event_view",
  "join_click",
  "create_start",
  "share_click",
  "swipe_view",
  "swipe_right",
  "swipe_left",
  "swipe_undo",
  "deck_end",
] as const;

export type ServerEvent =
  | "join_success"
  | "event_confirmed"
  | "create_success"
  | "paywall_shown"
  | "checkout_start"
  | "checkout_success"
  | "waitlist_submit"
  | "repeat_created";

export async function track(
  name: ServerEvent | (typeof CLIENT_EVENTS)[number],
  opts: { eventId?: string | null; citySlug?: string | null; token?: string | null; isDemo?: boolean } = {},
): Promise<void> {
  if (opts.isDemo) return;
  try {
    await db().from("analytics_events").insert({
      name,
      event_id: opts.eventId ?? null,
      city_slug: opts.citySlug ?? null,
      user_token: opts.token ?? null,
    });
  } catch (e) {
    console.error("track failed", name, (e as Error).message);
  }
}

export interface FunnelRow {
  name: string;
  total: number;
  people: number;
  last24h: number;
}

export async function funnel(): Promise<Map<string, FunnelRow>> {
  const { data } = await db().rpc("funnel_counts");
  const out = new Map<string, FunnelRow>();
  for (const r of (data ?? []) as { r_name: string; r_total: number; r_people: number; r_last_24h: number }[]) {
    out.set(r.r_name, { name: r.r_name, total: Number(r.r_total), people: Number(r.r_people), last24h: Number(r.r_last_24h) });
  }
  return out;
}

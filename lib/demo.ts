// Jury demo (Business Cup FAQ Q35/Q66/Q69): one click creates a fresh, clearly labeled demo plan, and
// "Add a demo guest" joins people through the SAME join_event logic. Nothing here bypasses the core:
// counts, confirmation and emails come from the real functions. Demo plans never show in public lists.
import "server-only";
import { randomUUID } from "node:crypto";
import { customAlphabet } from "nanoid";
import { DateTime } from "luxon";
import { db, firstRow } from "./db";

export const DEMO_DOMAIN = "demo.invalid";
const suffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 4);
const GUESTS = ["Sam", "Jordan", "Priya", "Marcus", "Lena", "Diego", "Aisha", "Theo", "Mia", "Noah"];

export const isDemoCode = (code: string) => /^demo[a-z0-9]{4}$/.test(code);

export async function createDemoPlan(ip: string | null): Promise<string> {
  const { data: venue } = await db()
    .from("venues")
    .select("id, name")
    .eq("city_slug", "austin")
    .ilike("name", "Cherrywood%")
    .limit(1)
    .maybeSingle();
  // Tomorrow 7 PM in Austin: always more than 3 h away, so the fill deadline is real.
  const startsAt = DateTime.now()
    .setZone("America/Chicago")
    .plus({ days: 1 })
    .set({ hour: 19, minute: 0, second: 0, millisecond: 0 })
    .toUTC()
    .toISO()!;
  const placeName = venue?.name ?? "Cherrywood Coffee House";
  for (let i = 0; i < 3; i++) {
    const code = `demo${suffix()}`;
    const { data, error } = await db().rpc("create_event", {
      p_code: code,
      p_city: "austin",
      p_venue_id: venue?.id ?? null,
      p_place_name: venue ? null : placeName,
      p_place_lat: venue ? null : 30.2995,
      p_place_lng: venue ? null : -97.7134,
      p_activity: "board_games",
      p_activity_other: null,
      p_title: `Board games at ${placeName}`,
      p_description: "Demo plan for trying iFound. Join it yourself, add demo guests, and watch it flip to “It’s on”.",
      p_starts_at: startsAt,
      p_duration: 120,
      p_min: 3,
      p_max: 6,
      p_host_token: randomUUID(),
      p_host_name: "Riley (demo host)",
      p_host_email: `host@${DEMO_DOMAIN}`,
      p_host_photo: null,
      p_venue_claim_id: null,
      p_is_demo: true,
      p_ip: ip,
    });
    if (!error && data) return code;
    if (error && error.code !== "23505") throw error;
  }
  throw new Error("could not allocate a demo code");
}

export async function addDemoGuest(eventId: string, ip: string | null) {
  const { count } = await db().from("participants").select("id", { count: "exact", head: true }).eq("event_id", eventId);
  const name = `${GUESTS[(count ?? 0) % GUESTS.length]} (demo)`;
  const { data, error } = await db().rpc("join_event", {
    p_event_id: eventId,
    p_user_token: randomUUID(),
    p_name: name,
    p_email: `guest-${randomUUID().slice(0, 8)}@${DEMO_DOMAIN}`,
    p_photo_path: null,
    p_ip: ip,
  });
  if (error) throw error;
  return firstRow<{ r_result: string; r_status: string; r_count: number; r_participant_id: string | null; r_just_confirmed: boolean }>(data);
}

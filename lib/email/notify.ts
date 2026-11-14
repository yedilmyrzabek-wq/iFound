// Who gets which email. Emails are read here, server-side only, and never returned to any client.
import "server-only";
import { DateTime } from "luxon";
import { db } from "../db";
import { signLink } from "../sign";
import { buildIcs } from "../ics";
import { formatDeadline, formatShort, zoneAbbr } from "../tz";
import { fillDeadline } from "../status";
import { sendOnce } from "./send";
import * as T from "./templates";

interface Ctx {
  id: string;
  code: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  minPeople: number;
  count: number;
  timezone: string;
  where: string;
  url: string;
  site: string;
  isVenuePlan: boolean;
}

async function loadCtx(eventId: string, site: string): Promise<Ctx | null> {
  const { data } = await db()
    .from("events")
    .select(
      "id, code, title, starts_at, duration_minutes, min_people, participant_count, venue_claim_id, place_name, venue:venues!events_venue_id_fkey(name, address), city:cities!events_city_slug_fkey(timezone)",
    )
    .eq("id", eventId)
    .maybeSingle();
  if (!data) return null;
  const r = data as unknown as {
    id: string; code: string; title: string; starts_at: string; duration_minutes: number; min_people: number;
    participant_count: number; venue_claim_id: string | null; place_name: string | null;
    venue: { name: string; address: string | null } | null; city: { timezone: string } | null;
  };
  const where = r.venue ? [r.venue.name, r.venue.address].filter(Boolean).join(", ") : r.place_name ?? "";
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    startsAt: DateTime.fromISO(r.starts_at, { zone: "utc" }).toUTC().toISO()!,
    durationMinutes: r.duration_minutes,
    minPeople: r.min_people,
    count: r.participant_count,
    timezone: r.city?.timezone ?? "America/Chicago",
    where,
    url: `${site}/e/${r.code}`,
    site,
    isVenuePlan: !!r.venue_claim_id,
  };
}

function plan(c: Ctx): T.PlanInfo {
  return { title: c.title, when: formatShort(c.startsAt, c.timezone), where: c.where, url: c.url };
}

function leaveUrl(c: Ctx, participantId: string): string {
  const end = DateTime.fromISO(c.startsAt).plus({ minutes: c.durationMinutes }).toMillis();
  return `${c.site}/l/${signLink("leave", participantId, end)}`;
}

function ics(c: Ctx) {
  const domain = new URL(c.site).hostname;
  return {
    filename: "ifound-plan.ics",
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
    content: buildIcs({ id: c.id, title: c.title, startsAt: c.startsAt, durationMinutes: c.durationMinutes, location: c.where, url: c.url, domain }),
  };
}

async function activeParticipants(eventId: string) {
  const { data } = await db()
    .from("participants")
    .select("id, email")
    .eq("event_id", eventId)
    .is("left_at", null);
  return (data ?? []) as { id: string; email: string }[];
}

export async function notifyHostCreated(eventId: string, hostEmail: string, site: string) {
  const c = await loadCtx(eventId, site);
  if (!c) return;
  if (c.isVenuePlan) return notifyVenueCreated(c, hostEmail);
  const m = T.hostCreated({ ...plan(c), minPeople: c.minPeople, needed: Math.max(c.minPeople - c.count, 0) });
  await sendOnce({ dedupeKey: `host_created:${c.id}`, to: hostEmail, ...m });
}

const VENUE_LINK_DAYS = 30;

async function notifyVenueCreated(c: Ctx, email: string) {
  const { data } = await db()
    .from("events")
    .select("venue_claim_id, claim:venue_claims!events_venue_claim_id_fkey(id, verified_at, venue:venues(name))")
    .eq("id", c.id)
    .maybeSingle();
  const claim = (data as unknown as { claim: { id: string; verified_at: string | null; venue: { name: string } | null } | null })?.claim;
  if (!claim) return;
  const exp = Date.now() + VENUE_LINK_DAYS * 24 * 3600_000;
  const token = signLink("venue", claim.id, exp);
  const manageUrl = `${c.site}/v/manage/${token}`;
  if (claim.verified_at) {
    await sendOnce({ dedupeKey: `host_created:${c.id}`, to: email, ...T.venueHostCreated({ ...plan(c), minPeople: c.minPeople, manageUrl }) });
  } else {
    await sendOnce({
      dedupeKey: `venue_verify:${claim.id}:${c.id}`,
      to: email,
      ...T.venueVerify({ ...plan(c), venueName: claim.venue?.name ?? "your venue", verifyUrl: `${c.site}/v/verify/${token}`, manageUrl }),
    });
  }
}

/** Called only from the request that got r_just_confirmed = true (or with confirmed status for late joiners). */
export async function notifyJoin(eventId: string, participantId: string, justConfirmed: boolean, status: string, site: string) {
  const c = await loadCtx(eventId, site);
  if (!c) return;

  if (justConfirmed) {
    // "It's on" to every active participant, the new joiner included. email_log makes each one exactly-once.
    const people = await activeParticipants(eventId);
    const whenShort = DateTime.fromISO(c.startsAt).setZone(c.timezone).toFormat("ccc h a") + ` ${zoneAbbr(c.timezone)}`;
    await Promise.all(
      people.map((p) =>
        sendOnce({
          dedupeKey: `confirmed:${c.id}:${p.id}`,
          to: p.email,
          ...T.confirmed({ ...plan(c), count: c.count, whenShort, leaveUrl: leaveUrl(c, p.id) }),
          attachments: [ics(c)],
        }),
      ),
    );
    return;
  }

  const { data: me } = await db().from("participants").select("id, email").eq("id", participantId).maybeSingle();
  if (!me) return;
  if (status === "confirmed") {
    await sendOnce({
      dedupeKey: `joined_confirmed:${c.id}:${me.id}`,
      to: me.email,
      ...T.joinedConfirmed({ ...plan(c), count: c.count, leaveUrl: leaveUrl(c, me.id) }),
      attachments: [ics(c)],
    });
  } else {
    await sendOnce({
      dedupeKey: `joined_filling:${c.id}:${me.id}`,
      to: me.email,
      ...T.joinedFilling({
        ...plan(c),
        count: c.count,
        minPeople: c.minPeople,
        deadline: formatDeadline(fillDeadline(c.startsAt), c.timezone),
        leaveUrl: leaveUrl(c, me.id),
      }),
    });
  }
}

export async function notifyCancelled(eventId: string, reason: "unfilled" | "host" | "moderation", site: string) {
  const c = await loadCtx(eventId, site);
  if (!c) return;
  const people = await activeParticipants(eventId);
  const m = reason === "unfilled" ? T.cancelledUnfilled(plan(c)) : T.cancelledHost(plan(c));
  const key = reason === "unfilled" ? "cancelled_unfilled" : "cancelled_host";
  await Promise.all(people.map((p) => sendOnce({ dedupeKey: `${key}:${c.id}:${p.id}`, to: p.email, ...m })));
}

/** "See you tomorrow" to every active participant of a confirmed plan (deduped: one per person per plan). */
export async function notifyReminder(eventId: string, site: string) {
  const c = await loadCtx(eventId, site);
  if (!c) return;
  const people = await activeParticipants(eventId);
  const whenShort = DateTime.fromISO(c.startsAt).setZone(c.timezone).toFormat("ccc h:mm a") + ` ${zoneAbbr(c.timezone)}`;
  await Promise.all(
    people.map((p) =>
      sendOnce({
        dedupeKey: `reminder:${c.id}:${p.id}`,
        to: p.email,
        ...T.reminderDayBefore({ ...plan(c), count: c.count, whenShort, leaveUrl: leaveUrl(c, p.id) }),
        attachments: [ics(c)],
      }),
    ),
  );
}

/** Invites everyone who was in the source plan (except the host) to next week's copy. */
export async function notifyRepeat(sourceEventId: string, newEventId: string, site: string) {
  const c = await loadCtx(newEventId, site);
  if (!c) return;
  const { data } = await db()
    .from("participants")
    .select("id, email, is_host, display_name")
    .eq("event_id", sourceEventId)
    .is("left_at", null);
  const rows = (data ?? []) as { id: string; email: string; is_host: boolean; display_name: string }[];
  const hostName = rows.find((r) => r.is_host)?.display_name ?? "The host";
  await Promise.all(
    rows
      .filter((r) => !r.is_host)
      .map((r) => sendOnce({ dedupeKey: `repeat_invite:${c.id}:${r.id}`, to: r.email, ...T.repeatInvite({ ...plan(c), hostName }) })),
  );
}

/** The exact email a participant would get, rendered for the in-app demo preview (no recipient shown). */
export async function previewEmail(eventId: string, type: "confirmed" | "joined" | "reminder" | "repeat", site: string) {
  const c = await loadCtx(eventId, site);
  if (!c) return null;
  const whenShort = DateTime.fromISO(c.startsAt).setZone(c.timezone).toFormat("ccc h a") + ` ${zoneAbbr(c.timezone)}`;
  const leave = `${c.site}/l/preview`;
  switch (type) {
    case "confirmed":
      return T.confirmed({ ...plan(c), count: c.count, whenShort, leaveUrl: leave });
    case "reminder":
      return T.reminderDayBefore({ ...plan(c), count: c.count, whenShort, leaveUrl: leave });
    case "repeat":
      return T.repeatInvite({ ...plan(c), hostName: "Riley" });
    default:
      return T.joinedFilling({
        ...plan(c),
        count: c.count,
        minPeople: c.minPeople,
        deadline: formatDeadline(fillDeadline(c.startsAt), c.timezone),
        leaveUrl: leave,
      });
  }
}

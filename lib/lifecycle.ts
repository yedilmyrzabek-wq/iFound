// Leave / cancel wrappers around the Postgres functions. Authorization happens in the routes.
import "server-only";
import { db, firstRow } from "./db";
import { apiError } from "./http";
import type { EventStatus } from "./types";

type LeaveResult = "left" | "not_joined" | "host_must_cancel" | "closed";

export async function leaveParticipant(participantId: string) {
  const { data, error } = await db().rpc("leave_event", { p_participant_id: participantId });
  if (error) throw error;
  return firstRow<{ r_result: LeaveResult; r_status: EventStatus | null; r_count: number }>(data);
}

export async function cancelEvent(eventId: string, reason: "host" | "moderation") {
  const { data, error } = await db().rpc("cancel_event", { p_event_id: eventId, p_reason: reason });
  if (error) throw error;
  return data as "cancelled" | "closed" | "not_found";
}

export function leaveError(r: LeaveResult | undefined) {
  switch (r) {
    case "host_must_cancel":
      return apiError("host_must_cancel", "Hosts can't leave. You can cancel the plan instead.", 409);
    case "closed":
      return apiError("closed", "This plan is already over or called off.", 410);
    default:
      return apiError("not_joined", "You're not in this plan.", 404);
  }
}

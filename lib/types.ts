// Shared API contracts. Every lane imports from here — never redefine these shapes.

export const ACTIVITIES = ["board_games", "coffee", "run", "soccer", "movie", "walk", "other"] as const;
export type Activity = (typeof ACTIVITIES)[number];

export type EventStatus = "filling" | "confirmed" | "cancelled" | "completed";
export type CancelReason = "unfilled" | "host" | "moderation";

export const VENUE_CATEGORIES = ["cafe", "game_store", "park", "pitch", "cinema", "library", "community_centre"] as const;
export type VenueCategory = (typeof VENUE_CATEGORIES)[number];

export const DURATIONS = [60, 90, 120, 180] as const;
export type Duration = (typeof DURATIONS)[number];

export type DayFilter = "today" | "tomorrow" | "weekend" | "week" | "all";

export interface City {
  slug: string;
  name: string;
  timezone: string;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  openCount: number;
}

export interface Venue {
  id: string;
  citySlug: string;
  name: string;
  address: string | null;
  category: VenueCategory;
  lat: number;
  lng: number;
}

export interface PersonPublic {
  /** Stable per-participant id for React keys; never a token. */
  id: string;
  name: string;
  photoUrl: string | null;
  isHost: boolean;
}

export interface EventSummary {
  code: string;
  citySlug: string;
  title: string;
  activity: Activity;
  activityOther: string | null;
  /** ISO string, UTC. Format it only through lib/tz.ts. */
  startsAt: string;
  durationMinutes: number;
  minPeople: number;
  maxPeople: number;
  count: number;
  /** Effective status computed on read (lib/status.ts). */
  status: EventStatus;
  cancelReason: CancelReason | null;
  isFull: boolean;
  isDemo: boolean;
  place: { name: string; address: string | null; lat: number; lng: number; venueId: string | null };
  /** Set only when the venue claim is verified. */
  hostVenueName: string | null;
}

export type ViewerRole = "guest" | "participant" | "host";

export interface EventDetail extends EventSummary {
  description: string | null;
  timezone: string;
  cityName: string;
  /** Deadline to reach minPeople: startsAt − 2h, ISO UTC. */
  fillDeadline: string;
  /** Human host (null for venue-hosted plans). Always visible. */
  host: { name: string; photoUrl: string | null } | null;
  viewer: {
    role: ViewerRole;
    canSeeParticipants: boolean;
    /** Join is possible right now for this viewer. */
    canJoin: boolean;
  };
  /** Present only when viewer.canSeeParticipants; otherwise the server sends nothing. */
  participants: PersonPublic[] | null;
  /** Next week's copy of this plan, if it was run again. */
  repeatCode: string | null;
  /** The plan this one repeats, if any. */
  repeatOfCode: string | null;
}

export interface CreateEventInput {
  city: string;
  venueId: string | null;
  place: { name: string; lat: number; lng: number } | null;
  activity: Activity;
  activityOther: string | null;
  title: string;
  description: string;
  /** "YYYY-MM-DDTHH:mm" in the CITY's timezone. */
  startsAtLocal: string;
  durationMinutes: Duration;
  minPeople: number;
  maxPeople: number;
  host: { name: string; email: string; photoPath: string | null; is18: boolean };
  asVenue: { enabled: boolean; email: string | null };
}

export interface CreateEventResponse {
  code: string;
  url: string;
}

export interface JoinInput {
  name: string;
  email: string;
  photoPath: string | null;
  is18: boolean;
}

export type JoinResult = "joined" | "already_joined" | "full" | "closed" | "not_found";

export interface JoinResponse {
  result: JoinResult;
  status: EventStatus;
  count: number;
  minPeople: number;
  maxPeople: number;
  justConfirmed: boolean;
}

export type ApiErrorCode =
  | "invalid_input"
  | "starts_at_out_of_range"
  | "rate_limited"
  | "upgrade_required"
  | "bad_origin"
  | "not_found"
  | "already_joined"
  | "full"
  | "closed"
  | "not_joined"
  | "host_must_cancel"
  | "forbidden"
  | "profile_required"
  | "server_error";

export interface ApiError {
  error: ApiErrorCode;
  message: string;
}

export interface DeckCard extends EventSummary {
  timezone: string;
  host: { name: string; photoUrl: string | null } | null;
}

export interface DeckResponse {
  cards: DeckCard[];
  nextCursor: number | null;
}

export interface MeProfile {
  name: string;
  email: string;
  photoPath: string | null;
}

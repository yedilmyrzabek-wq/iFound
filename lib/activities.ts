import type { Activity, VenueCategory } from "./types";

export const ACTIVITY_META: Record<Activity, { label: string; emoji: string }> = {
  board_games: { label: "Board games", emoji: "🎲" },
  coffee: { label: "Coffee", emoji: "☕" },
  run: { label: "Run", emoji: "🏃" },
  soccer: { label: "Soccer", emoji: "⚽" },
  movie: { label: "Movie", emoji: "🎬" },
  walk: { label: "Walk", emoji: "🚶" },
  other: { label: "Other", emoji: "✨" },
};

/** Which venue categories we suggest first for an activity (TZ §5). A hint for sorting, never a restriction. */
export const SUGGESTED_CATEGORIES: Record<Activity, VenueCategory[]> = {
  board_games: ["cafe", "game_store", "library", "community_centre"],
  coffee: ["cafe"],
  run: ["park"],
  walk: ["park"],
  soccer: ["pitch", "park"],
  movie: ["cinema"],
  other: ["library", "community_centre"],
};

export function activityLabel(activity: Activity, other: string | null): string {
  return activity === "other" && other ? other : ACTIVITY_META[activity].label;
}

export const CATEGORY_LABEL: Record<VenueCategory, string> = {
  cafe: "Cafe",
  game_store: "Game store",
  park: "Park",
  pitch: "Soccer field",
  cinema: "Cinema",
  library: "Library",
  community_centre: "Community center",
};

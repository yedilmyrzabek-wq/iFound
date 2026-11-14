"use client";
import { useEffect } from "react";
import { track } from "./track";

/** Records one funnel view event on mount. */
export function TrackView({ name, city }: { name: string; city?: string }) {
  useEffect(() => {
    track(name, { city });
  }, [name, city]);
  return null;
}

"use client";
import { useEffect, useState } from "react";
import { nowUtc } from "@/lib/tz";

/** Starts at the server's "now" (no hydration mismatch), then ticks on the client. */
export function useNow(serverNow: string, everyMs = 30_000) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(nowUtc());
    const id = setInterval(() => setNow(nowUtc()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

/** The viewer's IANA zone — only known after mount. */
export function useViewerZone() {
  const [zone, setZone] = useState<string | null>(null);
  useEffect(() => {
    setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  return zone;
}

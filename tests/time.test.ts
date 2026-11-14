// Test 9 (TZ §21) and friends: time zones are the most likely bug in the demo.
import { describe, expect, it } from "vitest";
import { cityLocalToUtc, dayRange, formatRange, formatShort, formatViewerLocal, createBounds } from "@/lib/tz";
import { effectiveStatus } from "@/lib/status";

describe("time zones", () => {
  it("9a. 19:00 typed for Austin is stored as 01:00Z the next day", () => {
    expect(cityLocalToUtc("2026-11-20T19:00", "America/Chicago")).toBe("2026-11-21T01:00:00Z");
  });

  it("handles DST: 19:00 Austin in July is 00:00Z", () => {
    expect(cityLocalToUtc("2026-07-10T19:00", "America/Chicago")).toBe("2026-07-11T00:00:00Z");
  });

  it("9b. 'Today' for Austin is the Austin calendar day, even when the server/viewer is UTC or Astana", () => {
    // 2026-11-14 03:00Z = Nov 13, 9:00 PM in Austin. "Today" must end at Nov 14 00:00 Austin = 06:00Z.
    const r = dayRange("today", "America/Chicago", "2026-11-14T03:00:00Z");
    expect(r).toEqual({ from: "2026-11-14T03:00:00Z", to: "2026-11-14T06:00:00Z" });
    const t = dayRange("tomorrow", "America/Chicago", "2026-11-14T03:00:00Z");
    expect(t).toEqual({ from: "2026-11-14T06:00:00Z", to: "2026-11-15T06:00:00Z" });
  });

  it("'This weekend' runs Sat 00:00 → Mon 00:00 in the city", () => {
    // Wed Nov 18 2026, noon in Austin
    const r = dayRange("weekend", "America/Chicago", "2026-11-18T18:00:00Z");
    expect(r).toEqual({ from: "2026-11-21T06:00:00Z", to: "2026-11-23T06:00:00Z" });
  });

  it("formats in the city zone with a label", () => {
    expect(formatShort("2026-11-21T01:00:00Z", "America/Chicago")).toBe("Fri, Nov 20 · 7:00 PM CT");
    expect(formatRange("2026-11-21T01:00:00Z", 120, "America/Chicago")).toBe("Friday, Nov 20 · 7:00–9:00 PM CT");
  });

  it("shows the viewer's local time only when the zone differs (Astana jury)", () => {
    expect(formatViewerLocal("2026-11-21T01:00:00Z", "America/Chicago", "Asia/Almaty")).toBe("That's 6:00 AM Sat in your time");
    expect(formatViewerLocal("2026-11-21T01:00:00Z", "America/Chicago", "America/Chicago")).toBeNull();
  });

  it("create bounds start 3h out, rounded up to 15 minutes, in city time", () => {
    expect(createBounds("America/Chicago", "2026-11-14T15:07:00Z").min).toBe("2026-11-14T12:15");
  });
});

describe("effective status on read", () => {
  const base = { cancelReason: null, durationMinutes: 120 } as const;
  it("filling past the fill deadline reads as called off even before the cron runs", () => {
    expect(effectiveStatus({ ...base, status: "filling", startsAt: "2026-11-20T20:00:00Z" }, "2026-11-20T18:30:00Z")).toEqual({
      status: "cancelled",
      cancelReason: "unfilled",
    });
  });
  it("confirmed past its end reads as completed", () => {
    expect(effectiveStatus({ ...base, status: "confirmed", startsAt: "2026-11-20T20:00:00Z" }, "2026-11-20T22:00:00Z").status).toBe(
      "completed",
    );
  });
  it("confirmed inside the last 2 hours stays confirmed", () => {
    expect(effectiveStatus({ ...base, status: "confirmed", startsAt: "2026-11-20T20:00:00Z" }, "2026-11-20T19:00:00Z").status).toBe(
      "confirmed",
    );
  });
});

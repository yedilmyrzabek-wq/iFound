import { beforeAll, describe, expect, it } from "vitest";
import { signLink, verifyLink } from "@/lib/sign";
import { buildIcs } from "@/lib/ics";
import { hasProfanity } from "@/lib/profanity";

beforeAll(() => {
  process.env.APP_SIGNING_SECRET ||= "test-secret-that-is-long-enough";
});

describe("signed links", () => {
  it("round-trips and checks type", () => {
    const t = signLink("leave", "abc", Date.now() + 60_000);
    expect(verifyLink(t, "leave")).toEqual({ id: "abc" });
    expect(verifyLink(t, "venue")).toBeNull();
  });
  it("rejects tampering and expiry", () => {
    const t = signLink("leave", "abc", Date.now() + 60_000);
    const [body, mac] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ t: "leave", id: "xyz", exp: 9999999999 })).toString("base64url");
    expect(verifyLink(`${forged}.${mac}`, "leave")).toBeNull();
    expect(verifyLink(`${body}.AAAA`, "leave")).toBeNull();
    expect(verifyLink(signLink("leave", "abc", Date.now() - 1000), "leave")).toBeNull();
  });
});

describe(".ics", () => {
  it("uses UTC with Z and a stable UID", () => {
    const ics = buildIcs({
      id: "e1",
      title: "Board games at Dicey Cafe",
      startsAt: "2026-11-21T01:00:00Z",
      durationMinutes: 120,
      location: "Dicey Cafe, 123 Main St",
      url: "https://ifound.example/e/abc",
      domain: "ifound.example",
    });
    expect(ics).toContain("DTSTART:20261121T010000Z");
    expect(ics).toContain("DTEND:20261121T030000Z");
    expect(ics).toContain("UID:e1@ifound.example");
    expect(ics).toContain("LOCATION:Dicey Cafe\\, 123 Main St");
  });
});

describe("profanity filter", () => {
  it("catches words and leetspeak, not innocent substrings", () => {
    expect(hasProfanity("this is sh1t")).toBe(true);
    expect(hasProfanity("Scunthorpe soccer", "Classic games")).toBe(false);
  });
});

// Signed links (TZ §16): base64url(JSON {t, id, exp}) + "." + base64url(HMAC-SHA256).
import { createHmac, timingSafeEqual } from "node:crypto";

export type LinkType = "leave" | "venue" | "restore";

interface Payload {
  t: LinkType;
  id: string;
  exp: number; // unix seconds
}

function secret(): string {
  const s = process.env.APP_SIGNING_SECRET;
  if (!s || s.length < 16) throw new Error("APP_SIGNING_SECRET is not set (min 16 chars)");
  return s;
}

const b64 = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

export function signLink(t: LinkType, id: string, expiresAt: Date | number): string {
  const exp = Math.floor((typeof expiresAt === "number" ? expiresAt : expiresAt.getTime()) / 1000);
  const body = b64(JSON.stringify({ t, id, exp } satisfies Payload));
  const mac = createHmac("sha256", secret()).update(body).digest();
  return `${body}.${b64(mac)}`;
}

export function verifyLink(token: string, expected: LinkType, nowMs: number = Date.now()): { id: string } | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const want = createHmac("sha256", secret()).update(body).digest();
  const got = Buffer.from(mac, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (p.t !== expected || typeof p.id !== "string" || p.exp * 1000 < nowMs) return null;
    return { id: p.id };
  } catch {
    return null;
  }
}

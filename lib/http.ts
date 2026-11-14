// Small helpers shared by route handlers.
import "server-only";
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createHmac } from "node:crypto";
import type { ApiErrorCode } from "./types";

export const UID_COOKIE = "ifound_uid";
export const ADMIN_COOKIE = "ifound_admin";
export const UID_HEADER = "x-ifound-uid";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(v: string | undefined | null): v is string {
  return !!v && UUID_RE.test(v);
}

/** The browser token. middleware.ts guarantees it on every request (also on the very first one). */
export async function userToken(): Promise<string> {
  const h = await headers();
  const fromHeader = h.get(UID_HEADER);
  if (isUuid(fromHeader)) return fromHeader;
  const c = (await cookies()).get(UID_COOKIE)?.value;
  if (isUuid(c)) return c;
  throw new Error("ifound_uid missing — is middleware.ts running?");
}

export function apiError(error: ApiErrorCode, message: string, status: number) {
  return NextResponse.json({ error, message }, { status });
}

/** CSRF guard for every POST except the Stripe webhook (TZ §10). */
export function originOk(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const allowed = new Set<string>();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) allowed.add(host);
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      allowed.add(new URL(site).host);
    } catch {}
  }
  return allowed.has(originHost);
}

export function badOrigin() {
  return apiError("bad_origin", "This request didn't come from iFound.", 403);
}

export function clientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  if (!ip) return null;
  // inet accepts v4/v6; strip a port or IPv6 brackets if a proxy left them.
  const cleaned = ip.replace(/^\[|\]$/g, "").replace(/^(\d+\.\d+\.\d+\.\d+):\d+$/, "$1");
  return /^[0-9a-f.:]+$/i.test(cleaned) ? cleaned : null;
}

export function adminCookieValue(): string | null {
  const s = process.env.ADMIN_SECRET;
  if (!s) return null;
  return createHmac("sha256", s).update("ifound-admin-v1").digest("base64url");
}

export async function isAdmin(): Promise<boolean> {
  const want = adminCookieValue();
  if (!want) return false;
  return (await cookies()).get(ADMIN_COOKIE)?.value === want;
}

export function siteUrl(req?: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  if (req) return new URL(req.url).origin;
  return "http://localhost:3000";
}

/** POSTs can't work without the database; say so plainly instead of crashing (local preview only). */
export function previewBlocked() {
  if (process.env.NODE_ENV === "production" || process.env.SUPABASE_URL) return null;
  return apiError("server_error", "Preview mode: the database isn't connected yet, so joining and starting plans are off.", 503);
}

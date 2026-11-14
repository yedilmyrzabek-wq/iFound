// /admin?key=<ADMIN_SECRET> lands here: sets the admin cookie, then goes to /admin.
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ADMIN_COOKIE, adminCookieValue } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const secret = process.env.ADMIN_SECRET ?? "";
  const ok = secret.length > 0 && key.length === secret.length && timingSafeEqual(Buffer.from(key), Buffer.from(secret));
  const res = NextResponse.redirect(new URL("/admin", url.origin));
  if (ok) {
    res.cookies.set(ADMIN_COOKIE, adminCookieValue()!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });
  }
  return res;
}

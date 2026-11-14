// Issues the anonymous browser token `ifound_uid` (TZ §4). No sign-up, no login.
// The token is written to the response cookie AND copied into the request headers,
// so the very first server render already sees it.
import { NextResponse, type NextRequest } from "next/server";

const UID_COOKIE = "ifound_uid";
const UID_HEADER = "x-ifound-uid";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(UID_COOKIE)?.value;
  const token = existing && UUID_RE.test(existing) ? existing : crypto.randomUUID();

  const headers = new Headers(req.headers);
  headers.set(UID_HEADER, token); // never trust a client-sent value: always overwritten here
  const res = NextResponse.next({ request: { headers } });

  if (token !== existing) {
    res.cookies.set(UID_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 400 * 24 * 3600,
    });
  }
  return res;
}

export const config = {
  // Everything except static assets. The Stripe webhook doesn't need the cookie but it's harmless.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|.*\\.(?:png|jpg|svg|webp|ico)$).*)"],
};

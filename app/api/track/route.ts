// Client-side funnel events (views, clicks, swipes). Server-side facts are tracked where they happen.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { CLIENT_EVENTS, track } from "@/lib/analytics";
import { originOk, previewBlocked, userToken } from "@/lib/http";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.enum(CLIENT_EVENTS),
  code: z.string().regex(/^[a-z0-9]{4,20}$/).nullable().default(null),
  city: z.string().max(40).nullable().default(null),
});

export async function POST(req: Request) {
  if (!originOk(req) || previewBlocked()) return new NextResponse(null, { status: 204 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });
  const { name, code, city } = parsed.data;
  let eventId: string | null = null;
  let isDemo = false;
  let citySlug = city;
  if (code) {
    const { data } = await db().from("events").select("id, is_demo, city_slug").eq("code", code).maybeSingle();
    eventId = data?.id ?? null;
    isDemo = !!data?.is_demo;
    citySlug = data?.city_slug ?? citySlug;
  }
  await track(name, { eventId, citySlug, token: await userToken(), isDemo });
  return new NextResponse(null, { status: 204 });
}

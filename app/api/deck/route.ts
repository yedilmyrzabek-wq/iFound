import { NextResponse } from "next/server";
import { getCity, getDeck } from "@/lib/events";
import { apiError, userToken } from "@/lib/http";
import type { DayFilter } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const city = await getCity(url.searchParams.get("city") ?? "");
  if (!city) return apiError("not_found", "We don't know that city yet.", 404);
  const d = url.searchParams.get("day") ?? "week";
  const day: DayFilter = d === "today" || d === "tomorrow" ? d : "week";
  const first = url.searchParams.get("first");
  const cursor = Math.max(0, Number(url.searchParams.get("cursor") ?? 0) || 0);
  const deck = await getDeck(city.slug, city.timezone, day, await userToken(), first && /^[a-z0-9]{4,20}$/.test(first) ? first : null, cursor);
  return NextResponse.json(deck, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";
import { listCities } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ cities: await listCities() });
}

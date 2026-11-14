import { NextResponse } from "next/server";
import { getCity, listVenues } from "@/lib/events";
import { apiError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await getCity(slug))) return apiError("not_found", "We don't know that city yet.", 404);
  return NextResponse.json({ venues: await listVenues(slug) });
}

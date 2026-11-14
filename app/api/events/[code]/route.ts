import { NextResponse } from "next/server";
import { getEventDetail } from "@/lib/events";
import { apiError, userToken } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const event = await getEventDetail(code, await userToken());
  if (!event) return apiError("not_found", "This plan doesn't exist or was removed.", 404);
  return NextResponse.json({ event }, { headers: { "Cache-Control": "no-store" } });
}

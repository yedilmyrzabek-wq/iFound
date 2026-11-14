import { NextResponse } from "next/server";
import { userToken } from "@/lib/http";
import { getMyPlans } from "@/lib/me";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getMyPlans(await userToken()), { headers: { "Cache-Control": "no-store" } });
}

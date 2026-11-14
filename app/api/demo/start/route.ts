import { NextResponse } from "next/server";
import { apiError, badOrigin, clientIp, originOk, previewBlocked, userToken } from "@/lib/http";
import { recordHits, underLimits } from "@/lib/limits";
import { createDemoPlan } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const rule = { bucket: `demo:token:${await userToken()}`, max: 10, windowMinutes: 60 };
  if (!(await underLimits([rule]))) return apiError("rate_limited", "That's plenty of demos for an hour.", 429);
  const code = await createDemoPlan(clientIp(req));
  await recordHits([rule]);
  return NextResponse.json({ code, url: `/e/${code}` }, { status: 201 });
}

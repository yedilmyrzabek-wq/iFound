// "Not you? Clear" — forget the saved name/email/photo for this browser (TZ §8.12).
import { NextResponse } from "next/server";
import { badOrigin, originOk, previewBlocked, userToken } from "@/lib/http";
import { clearProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  await clearProfile(await userToken());
  return NextResponse.json({ ok: true });
}

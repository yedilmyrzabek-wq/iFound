// Avatar upload (TZ §13): the client already cropped to 256×256 WebP. Private bucket; photos are only ever
// shown through 1-hour signed URLs to viewers allowed to see them.
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { AVATARS_BUCKET } from "@/lib/entitlement";
import { apiError, badOrigin, isAdmin, originOk, previewBlocked, userToken } from "@/lib/http";
import { RULES, recordHits, underLimits } from "@/lib/limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 300 * 1024;

function sniff(buf: Uint8Array): "image/webp" | "image/jpeg" | "image/png" | null {
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  return null;
}

export async function POST(req: Request) {
  if (!originOk(req)) return badOrigin();
  const blocked = previewBlocked();
  if (blocked) return blocked;
  const token = await userToken();
  if (!(await isAdmin()) && !(await underLimits([RULES.uploadToken(token)]))) {
    return apiError("rate_limited", "Too many photos in an hour. Try again later.", 429);
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return apiError("invalid_input", "Pick a photo.", 400);
  if (file.size > MAX_BYTES) return apiError("invalid_input", "That photo is too big. Please use a JPG or PNG photo.", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (type !== "image/webp") return apiError("invalid_input", "Please use a JPG or PNG photo.", 400);

  const path = `${randomUUID()}.webp`;
  const { error } = await db().storage.from(AVATARS_BUCKET).upload(path, bytes, { contentType: "image/webp", upsert: false });
  if (error) {
    console.error("avatar upload failed", error.message);
    return apiError("server_error", "Couldn't upload the photo. Try again.", 500);
  }
  await recordHits([RULES.uploadToken(token)]);
  return NextResponse.json({ photoPath: path });
}

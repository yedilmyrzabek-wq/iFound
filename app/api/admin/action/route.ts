import { NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, badOrigin, isAdmin, originOk, siteUrl } from "@/lib/http";
import { cancelEvent } from "@/lib/lifecycle";
import { notifyCancelled } from "@/lib/email/notify";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["hide_event", "unhide_event", "demo_on", "demo_off", "cancel_event", "hide_photo", "resolve_report"]),
  id: z.string().uuid(),
});

export async function POST(req: Request) {
  if (!originOk(req)) return badOrigin();
  if (!(await isAdmin())) return apiError("forbidden", "Admins only.", 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("invalid_input", "Bad action.", 400);
  const { action, id } = parsed.data;
  const now = new Date().toISOString();
  switch (action) {
    case "hide_event":
      await db().from("events").update({ hidden: true }).eq("id", id);
      await db().from("reports").update({ resolved_at: now }).eq("event_id", id).is("participant_id", null).is("resolved_at", null);
      break;
    case "unhide_event":
      await db().from("events").update({ hidden: false }).eq("id", id);
      break;
    case "demo_on":
    case "demo_off":
      await db().from("events").update({ is_demo: action === "demo_on" }).eq("id", id);
      break;
    case "cancel_event": {
      const r = await cancelEvent(id, "moderation");
      if (r === "cancelled") {
        const site = siteUrl(req);
        after(() => notifyCancelled(id, "moderation", site).catch((e) => console.error(e)));
      }
      break;
    }
    case "hide_photo":
      await db().from("participants").update({ photo_hidden: true }).eq("id", id);
      await db().from("reports").update({ resolved_at: now }).eq("participant_id", id).is("resolved_at", null);
      break;
    case "resolve_report":
      await db().from("reports").update({ resolved_at: now }).eq("id", id);
      break;
  }
  return NextResponse.json({ ok: true });
}

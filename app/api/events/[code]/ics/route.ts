import { db } from "@/lib/db";
import { getEventRow } from "@/lib/events";
import { apiError, siteUrl, userToken } from "@/lib/http";
import { buildIcs } from "@/lib/ics";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const token = await userToken();
  const row = await getEventRow(code);
  if (!row || row.hidden) return apiError("not_found", "This plan doesn't exist.", 404);
  const { data: me } = await db()
    .from("participants")
    .select("id")
    .eq("event_id", row.id)
    .eq("user_token", token)
    .is("left_at", null)
    .maybeSingle();
  if (!me && row.host_token !== token) return apiError("forbidden", "Join the plan to add it to your calendar.", 403);
  const site = siteUrl(req);
  const where = row.venue ? [row.venue.name, row.venue.address].filter(Boolean).join(", ") : row.place_name ?? "";
  const ics = buildIcs({
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    durationMinutes: row.duration_minutes,
    location: where,
    url: `${site}/e/${row.code}`,
    domain: new URL(site).hostname,
    cancelled: row.status === "cancelled",
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="ifound-${row.code}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}

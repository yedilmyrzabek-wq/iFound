// Share preview per plan (LinkedIn, Threads, iMessage): the letterboard count, title, when and where.
import { ImageResponse } from "next/og";
import { getEventRow } from "@/lib/events";
import { effectiveStatus } from "@/lib/status";
import { formatShort, nowUtc } from "@/lib/tz";
import { ACTIVITY_META } from "@/lib/activities";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A plan on iFound";

async function archivo(weight: 700 | 800): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Archivo:wght@${weight}&display=swap`, { cache: "force-cache" })).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url, { cache: "force-cache" })).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [row, bold, extra] = await Promise.all([getEventRow(code).catch(() => null), archivo(700), archivo(800)]);
  const fonts = [
    ...(bold ? [{ name: "Archivo", data: bold, weight: 700 as const, style: "normal" as const }] : []),
    ...(extra ? [{ name: "Archivo", data: extra, weight: 800 as const, style: "normal" as const }] : []),
  ];
  const opts = { ...size, fonts };
  const felt = "#1b1c1f";
  const letter = "#f5f3ec";
  const bulb = "#ffc83d";
  if (!row || row.hidden) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", background: felt, color: letter, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 96, fontWeight: 800 }}>
        iFound
      </div>,
      opts,
    );
  }
  const tz = row.city?.timezone ?? "America/Chicago";
  const eff = effectiveStatus({ status: row.status, cancelReason: row.cancel_reason, startsAt: row.starts_at, durationMinutes: row.duration_minutes }, nowUtc());
  const on = eff.status === "confirmed" || eff.status === "completed";
  const needed = Math.max(row.min_people - row.participant_count, 0);
  const big = on ? "IT'S ON!" : eff.status === "cancelled" ? "CALLED OFF" : `${row.participant_count} OF ${row.min_people}`;
  const small = on ? `${row.participant_count} GOING` : eff.status === "cancelled" ? "" : `NEEDS ${needed} MORE`;
  const where = row.venue?.name ?? row.place_name ?? "";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#f3f4f1", padding: 48, gap: 44, fontFamily: "Archivo" }}>
      <div style={{ width: 520, background: felt, borderRadius: 28, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 44px" }}>
        <div style={{ display: "flex", gap: 22, marginBottom: 36 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: on ? bulb : "#4a4232" }} />
          ))}
        </div>
        <div style={{ color: letter, fontSize: big.length > 7 ? 92 : 120, fontWeight: 800, letterSpacing: 2, lineHeight: 1 }}>{big}</div>
        {small && <div style={{ color: on ? "#22b866" : bulb, fontSize: 46, fontWeight: 700, marginTop: 18, letterSpacing: 2 }}>{small}</div>}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", color: "#16171a" }}>
        <div style={{ fontSize: 72 }}>{ACTIVITY_META[row.activity].emoji}</div>
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, marginTop: 16 }}>{row.title}</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#464a52", marginTop: 24 }}>{formatShort(row.starts_at, tz)}</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#464a52", marginTop: 6 }}>{where}</div>
        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 36 }}>iFound · it only happens if enough people are in</div>
      </div>
    </div>,
    opts,
  );
}

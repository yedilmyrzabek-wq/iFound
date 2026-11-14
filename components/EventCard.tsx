// One plan in a list: the letterboard count in miniature, so the same form repeats at card scale.
import Link from "next/link";
import { ACTIVITY_META } from "@/lib/activities";
import { formatCard, formatRelative } from "@/lib/tz";
import type { EventSummary } from "@/lib/types";
import { DemoChip, StatusChip } from "./StatusChip";

export function EventCard({ e, timezone, now }: { e: EventSummary; timezone: string; now: string }) {
  const needed = Math.max(e.minPeople - e.count, 0);
  const on = e.status === "confirmed";
  const pct = Math.min(100, Math.round((e.count / e.minPeople) * 100));
  return (
    <Link
      href={`/e/${e.code}`}
      className="group flex gap-3 rounded-[10px] border border-line bg-surface p-3 shadow-[var(--shadow-lift)] transition-[border-color,transform] duration-200 hover:border-line-strong active:scale-[0.99]"
    >
      <div className="felt flex w-[76px] shrink-0 flex-col items-center justify-center rounded-[8px] py-2 [container-type:inline-size]" aria-hidden="true">
        {on ? (
          <>
            <span className="letter text-[22px] leading-none">ON</span>
            <span className="letter mt-1 text-[11px] leading-none text-[#d6d4cc]">{e.count} going</span>
          </>
        ) : (
          <>
            <span className="letter text-[26px] leading-none">
              {e.count}
              <span className="mx-[3px] text-[14px] text-[#bdbcb5]">/</span>
              {e.minPeople}
            </span>
            <span className="letter mt-1 text-[11px] leading-none" style={{ color: "var(--color-bulb)" }}>
              {needed} more
            </span>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] leading-snug font-semibold text-ink">
            <span className="mr-1.5" aria-hidden="true">
              {ACTIVITY_META[e.activity].emoji}
            </span>
            {e.title}
          </h3>
          <StatusChip status={e.status} isFull={e.isFull} />
        </div>
        <p className="mt-0.5 truncate text-[14px] text-ink-2">
          {e.place.name}
          {e.hostVenueName && <span className="ml-1.5 font-medium text-ink">· Hosted by {e.hostVenueName} ✓</span>}
        </p>
        <p className="mt-0.5 text-[14px] text-ink-2">
          <span className="font-medium text-ink">{formatCard(e.startsAt, timezone)}</span> · {formatRelative(e.startsAt, now)}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e7e9e4]" aria-hidden="true">
            <div className={`h-full rounded-full ${on ? "bg-go" : "bg-bulb-deep"}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-[13px] font-medium text-ink-2">
            {on ? `${e.count} of ${e.maxPeople} spots` : `${e.count} of ${e.minPeople} · needs ${needed} more`}
          </span>
          {e.isDemo && <DemoChip />}
        </div>
      </div>
    </Link>
  );
}

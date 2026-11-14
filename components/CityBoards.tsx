"use client";
// "Pick your city" as a row of small departure boards: city in plastic letters, open plans, and the city's
// local time right now (the product always speaks in the city's time).
import Link from "next/link";
import { DateTime } from "luxon";
import type { City } from "@/lib/types";
import { zoneAbbr } from "@/lib/tz";
import { Icon } from "./Icon";
import { LetterLine } from "./Letterboard";
import { useNow } from "./useNow";

/** Secondary text on felt: tinted from the letter color, never a flat gray (≈7:1 on felt). */
const DIM = "rgb(245 243 236 / 0.62)";

export function CityBoards({ cities, serverNow }: { cities: City[]; serverNow: string }) {
  const now = useNow(serverNow, 30_000);
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-1">
      {cities.map((c, i) => {
        const [name, state] = c.name.split(", ");
        const local = DateTime.fromISO(now, { zone: "utc" }).setZone(c.timezone).toFormat("h:mm a");
        const featured = i === 0;
        return (
          <li key={c.slug} className={featured ? "col-span-2 lg:col-span-1" : ""}>
            <Link
              href={`/c/${c.slug}`}
              className="felt group flex h-full flex-col justify-between rounded-[12px] px-4 py-3.5 transition-transform duration-200 hover:-translate-y-0.5 [container-type:inline-size]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <LetterLine text={name} className={featured ? "text-[clamp(1.6rem,9cqw,2.3rem)]" : "text-[clamp(1.15rem,11cqw,1.6rem)]"} />
                  <span className="mt-1 block text-[12px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase" style={{ color: DIM }}>
                    {state} · {zoneAbbr(c.timezone)} · {local}
                  </span>
                </div>
                <Icon name="back" size={18} className="mt-1 shrink-0 rotate-180 transition-colors group-hover:!text-bulb" style={{ color: DIM }} />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                {c.openCount > 0 ? (
                  <>
                    <LetterLine text={String(c.openCount)} className="text-[26px] [&_.letter]:text-bulb" />
                    <span className="text-[13px] font-semibold tracking-[0.1em] text-bulb uppercase">
                      open {c.openCount === 1 ? "plan" : "plans"}
                    </span>
                  </>
                ) : (
                  <span className="text-[13px] font-semibold tracking-[0.08em] uppercase" style={{ color: DIM }}>
                    No plans yet
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

"use client";
// The hero of /e/[code]: headcount and status spelled on a felt letterboard, with a seat row
// that can't overflow the max and a marked minimum line.
import { useEffect, useRef, useState } from "react";
import { Bulbs, LetterLine } from "./Letterboard";
import type { CancelReason, EventStatus } from "@/lib/types";

export interface CounterProps {
  status: EventStatus;
  cancelReason: CancelReason | null;
  count: number;
  min: number;
  max: number;
  celebrate?: boolean;
}

export function boardText({ status, cancelReason, count, min, max }: Omit<CounterProps, "celebrate">) {
  const needed = Math.max(min - count, 0);
  const full = count >= max;
  switch (status) {
    case "filling":
      return {
        big: `${count} of ${min}`,
        mid: "are in",
        small: `needs ${needed} more`,
        label: `${count} of ${min} are in — needs ${needed} more`,
      };
    case "confirmed":
      return full
        ? { big: "It's on", mid: "full", small: `${count} going`, label: "It's on — full" }
        : {
            big: "It's on!",
            mid: `${count} going`,
            small: `room for ${max - count} more`,
            label: `It's on! ${count} people are going. Room for ${max - count} more`,
          };
    case "cancelled":
      return cancelReason === "unfilled"
        ? { big: "Called off", mid: "didn't fill", small: "", label: "Didn't fill — called off" }
        : { big: "Called off", mid: "by the host", small: "", label: "The host called this off" };
    case "completed":
      return { big: "It happened", mid: `${count} went`, small: "", label: "This plan already happened" };
  }
}

export function Counter(props: CounterProps) {
  const t = boardText(props);
  const key = `${t.big}|${t.mid}|${t.small}`;
  const prev = useRef(key);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (prev.current !== key) {
      prev.current = key;
      setAnimate(true);
      const id = setTimeout(() => setAnimate(false), 1400);
      return () => clearTimeout(id);
    }
  }, [key]);

  const on = props.status === "confirmed";
  const dead = props.status === "cancelled";
  const lit: boolean | "chase" = props.celebrate ? "chase" : on;
  // Big line sized to the board's width (container query units), so "IT'S ON!" and "4 OF 6" both fill it.
  const bigSize = `min(6.25rem, ${(92 / Math.max(t.big.length * 0.6, 3.6)).toFixed(2)}cqw)`;

  return (
    <section
      aria-live="polite"
      aria-atomic="true"
      className={`felt relative overflow-hidden rounded-[14px] pt-3 pb-4 [container-type:inline-size] ${dead ? "opacity-90" : ""}`}
    >
      <span className="sr-only">{t.label}</span>
      <Bulbs lit={lit} />
      <div key={animate ? key : "static"} className={`px-5 pt-4 pb-3 sm:px-7 ${dead ? "[&_.letter]:text-[#bdbcb5]" : ""}`}>
        <LetterLine text={t.big} animate={animate} style={{ fontSize: bigSize }} />
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <LetterLine text={t.mid} animate={animate} delayOffset={t.big.length * 40} className="text-[clamp(1.5rem,9cqw,2.6rem)]" />
          {t.small && (
            <LetterLine
              text={t.small}
              animate={animate}
              delayOffset={(t.big.length + t.mid.length) * 40}
              className={`text-[clamp(1rem,5.4cqw,1.45rem)] ${props.status === "filling" ? "[&_.letter]:text-bulb" : "[&_.letter]:text-[#d6d4cc]"}`}
            />
          )}
        </div>
      </div>
      <Seats count={props.count} min={props.min} max={props.max} status={props.status} />
      <Bulbs lit={lit} />
    </section>
  );
}

function Seats({ count, min, max, status }: { count: number; min: number; max: number; status: EventStatus }) {
  const filledColor = status === "confirmed" || status === "completed" ? "bg-go-bright" : status === "cancelled" ? "bg-off" : "bg-bulb";
  return (
    <div className="px-5 pb-3 sm:px-7" aria-hidden="true">
      <div className="flex flex-wrap items-center gap-[6px]">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className="flex items-center gap-[6px]">
            <span
              className={`block size-[14px] rounded-full transition-colors duration-300 ${
                i < count ? filledColor : "border border-white/25 bg-transparent"
              }`}
            />
            {i === min - 1 && i < max - 1 && (
              <span className="mx-1 flex h-[22px] items-center gap-1 border-l border-dashed border-white/50 pl-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/70">
                min
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

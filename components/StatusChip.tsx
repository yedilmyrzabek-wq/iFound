// Status in words + shape (dot, ring, strike), never color alone.
import type { EventStatus } from "@/lib/types";

export function statusLabel(status: EventStatus, isFull: boolean) {
  if (status === "confirmed") return isFull ? "Full" : "It's on";
  if (status === "filling") return "Filling";
  if (status === "cancelled") return "Called off";
  return "Happened";
}

export function StatusChip({ status, isFull }: { status: EventStatus; isFull: boolean }) {
  const label = statusLabel(status, isFull);
  const style =
    status === "confirmed"
      ? "bg-go text-white"
      : status === "filling"
        ? "bg-bulb text-ink"
        : "bg-[#e4e6e1] text-ink-2";
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold ${style}`}>
      {status === "confirmed" ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      ) : status === "filling" ? (
        <span className="size-2 rounded-full border-[1.5px] border-ink" aria-hidden="true" />
      ) : (
        <span className="h-[1.5px] w-2.5 bg-current" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

export function DemoChip() {
  return (
    <span
      title="Created by the iFound team to show how it works"
      className="inline-flex h-6 items-center rounded-full border border-line-strong px-2 text-[12px] font-semibold uppercase tracking-wide text-ink-2"
    >
      Demo
    </span>
  );
}

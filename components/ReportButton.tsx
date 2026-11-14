"use client";
import { useState } from "react";

const REASONS = [
  { v: "spam", label: "Spam or an ad" },
  { v: "inappropriate", label: "Inappropriate" },
  { v: "unsafe", label: "Feels unsafe" },
  { v: "fake", label: "Fake plan" },
  { v: "other", label: "Something else" },
] as const;

export function ReportButton({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("spam");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, reason }),
    }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  }

  if (state === "done") return <p className="text-[14px] text-ink-2">Thanks — we'll take a look.</p>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="min-h-11 px-3 text-[14px] text-ink-3 underline hover:text-ink">
        Report
      </button>
    );
  return (
    <form onSubmit={send} className="mx-auto max-w-sm rounded-[10px] border border-line bg-surface p-4 text-left">
      <fieldset>
        <legend className="text-[15px] font-semibold">What's wrong with this plan?</legend>
        <div className="mt-2 space-y-1">
          {REASONS.map((r) => (
            <label key={r.v} className="flex min-h-10 items-center gap-2.5 text-[15px]">
              <input type="radio" name="reason" value={r.v} checked={reason === r.v} onChange={() => setReason(r.v)} className="size-4 accent-[#16171a]" />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>
      {state === "error" && <p className="mt-2 text-[14px] text-danger">Couldn't send. Try again in a moment.</p>}
      <div className="mt-3 flex gap-2">
        <button disabled={state === "busy"} className="h-11 rounded-full bg-ink px-4 text-[15px] font-semibold text-white disabled:opacity-60">
          Send report
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-full px-3 text-[15px] font-semibold text-ink-2">
          Never mind
        </button>
      </div>
    </form>
  );
}

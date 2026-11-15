"use client";
// Jury demo controls. Each button calls the real product logic; nothing is simulated on the client.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DateTime } from "luxon";
import type { EventStatus } from "@/lib/types";

export function DemoStartButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [msg, setMsg] = useState("");
  async function start() {
    setState("busy");
    const r = await fetch("/api/demo/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const out = await r?.json().catch(() => null);
    if (r?.ok && out?.url) {
      router.push(out.url);
      return;
    }
    setMsg(out?.message ?? "Couldn't start the demo. Try again.");
    setState("error");
  }
  return (
    <div className={className}>
      <button
        onClick={start}
        disabled={state === "busy"}
        className="inline-flex h-[52px] items-center rounded-full bg-ink px-6 text-[17px] font-bold text-white disabled:opacity-60"
      >
        {state === "busy" ? "Setting up your demo…" : "Start the 60-second demo"}
      </button>
      {state === "error" && <p className="mt-2 text-[14px] text-danger">{msg}</p>}
    </div>
  );
}

export function DemoControls({
  code,
  status,
  startsAt,
  onChange,
}: {
  code: string;
  status: EventStatus;
  startsAt: string;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [reminded, setReminded] = useState(false);

  async function call(path: string, label: string) {
    setBusy(label);
    setNote(null);
    const r = await fetch(`/api/demo/${code}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const out = await r?.json().catch(() => null);
    if (!r?.ok) setNote(out?.message ?? "That didn't work. Try again.");
    else if (out?.justConfirmed) setNote("That guest made it happen — every real participant just got the “It's on” email.");
    else if (out?.step === "day_before") {
      setReminded(true);
      setNote("It's now the day before: everyone got the “See you tomorrow” reminder.");
    }
    setBusy(null);
    onChange();
  }

  const hoursLeft = DateTime.fromISO(startsAt).diff(DateTime.utc(), "hours").hours;
  const ffLabel =
    status === "filling" ? "Skip to the fill deadline" : status === "confirmed" && hoursLeft > 26 ? "Skip to the day before" : "Skip to after the plan";
  const open = status === "filling" || status === "confirmed";
  const on = status === "confirmed" || status === "completed";

  return (
    <section aria-label="Demo controls" className="mt-4 rounded-[12px] border-2 border-dashed border-bulb-deep bg-[#fff8e3] p-4">
      <p className="text-[15px] font-bold">Demo plan — for trying iFound</p>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
        {status === "filling" ? (
          <>
            Tap <span className="font-semibold text-ink">I'm in</span> yourself, then add labeled demo guests until it reaches 3. They join through the same
            logic as real people.
          </>
        ) : status === "completed" ? (
          <>It happened. Now try <span className="font-semibold text-ink">Run it again next week</span> below — that's what iFound+ is for.</>
        ) : (
          <>It's on. See the email everyone got, skip ahead to the day-before reminder, then to after the plan.</>
        )}{" "}
        This demo plan never shows up in public lists.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {open && status === "filling" && (
          <button onClick={() => call("guest", "guest")} disabled={!!busy} className="h-11 rounded-full bg-ink px-4 text-[15px] font-semibold text-white disabled:opacity-60">
            {busy === "guest" ? "Adding…" : "+ Add a demo guest"}
          </button>
        )}
        {on && (
          <a
            href={`/e/${code}/email?type=${reminded ? "reminder" : "confirmed"}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center rounded-full bg-ink px-4 text-[15px] font-semibold text-white"
          >
            {reminded ? "See the reminder email" : "See the email everyone got"}
          </a>
        )}
        {open && (
          <button
            onClick={() => call("fast-forward", "ff")}
            disabled={!!busy}
            className="h-11 rounded-full border border-line-strong bg-surface px-4 text-[15px] font-semibold disabled:opacity-60"
          >
            {busy === "ff" ? "Skipping…" : ffLabel}
          </button>
        )}
      </div>
      {note && <p className="mt-2 text-[14px] font-medium">{note}</p>}
    </section>
  );
}

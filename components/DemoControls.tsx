"use client";
// Jury demo controls. Each button calls the real product logic; nothing is simulated on the client.
import { useRouter } from "next/navigation";
import { useState } from "react";
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

export function DemoControls({ code, status, onChange }: { code: string; status: EventStatus; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function call(path: string, label: string) {
    setBusy(label);
    setNote(null);
    const r = await fetch(`/api/demo/${code}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const out = await r?.json().catch(() => null);
    if (!r?.ok) setNote(out?.message ?? "That didn't work. Try again.");
    else if (out?.justConfirmed) setNote("That guest made it happen — every real participant just got the “It's on” email.");
    setBusy(null);
    onChange();
  }

  const open = status === "filling" || status === "confirmed";
  return (
    <section aria-label="Demo controls" className="mt-4 rounded-[12px] border-2 border-dashed border-bulb-deep bg-[#fff8e3] p-4">
      <p className="text-[15px] font-bold">Demo plan — for trying iFound</p>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
        Tap <span className="font-semibold text-ink">I'm in</span> yourself, then add labeled demo guests until it reaches 3. They join through the same logic as
        real people. Demo plans never show up in public lists.
      </p>
      {open && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => call("guest", "guest")}
            disabled={!!busy}
            className="h-11 rounded-full bg-ink px-4 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {busy === "guest" ? "Adding…" : "+ Add a demo guest"}
          </button>
          <button
            onClick={() => call("fast-forward", "ff")}
            disabled={!!busy}
            className="h-11 rounded-full border border-line-strong bg-surface px-4 text-[15px] font-semibold disabled:opacity-60"
          >
            {busy === "ff" ? "Skipping…" : status === "filling" ? "Skip to the fill deadline" : "Skip to after the plan"}
          </button>
        </div>
      )}
      {note && <p className="mt-2 text-[14px] font-medium">{note}</p>}
    </section>
  );
}

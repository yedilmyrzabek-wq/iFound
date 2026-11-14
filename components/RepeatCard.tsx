"use client";
// "Make it a weekly thing": after a plan is on (or happened), the host can run it again next week with the same
// crew. For people it's part of iFound+; places and demo plans are free.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

export function RepeatCard({ code, repeatCode }: { code: string; repeatCode: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "paywall" | "error">("idle");
  const [msg, setMsg] = useState("");

  if (repeatCode) {
    return (
      <Link href={`/e/${repeatCode}`} className="mt-6 flex items-center justify-between gap-3 rounded-[12px] border border-line bg-surface p-4">
        <span>
          <span className="block text-[16px] font-bold">Next week's plan is up</span>
          <span className="block text-[14px] text-ink-2">Same place, same time — your crew got the invite first.</span>
        </span>
        <Icon name="back" className="shrink-0 rotate-180" />
      </Link>
    );
  }

  async function run() {
    setState("busy");
    const r = await fetch(`/api/events/${code}/repeat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const out = await r?.json().catch(() => null);
    if (r?.ok && out?.url) {
      router.push(out.url);
      return;
    }
    if (r?.status === 402) {
      setState("paywall");
      return;
    }
    setMsg(out?.message ?? "Couldn't create next week's plan. Try again.");
    setState("error");
  }

  return (
    <section aria-labelledby="weekly" className="felt mt-6 rounded-[14px] p-5 text-letter">
      <h2 id="weekly" className="text-[19px] font-extrabold">
        Make it a weekly thing
      </h2>
      <p className="mt-1 text-[15px] leading-relaxed" style={{ color: "rgb(245 243 236 / 0.75)" }}>
        Same place, same time, next week. Everyone from this plan hears about it first.
      </p>
      {state === "paywall" ? (
        <div className="mt-4 rounded-[10px] bg-surface p-4 text-ink">
          <p className="text-[15px] font-semibold">Running a plan every week is part of iFound+ — $8/month.</p>
          <Link href="/plus" className="mt-3 inline-flex h-11 items-center rounded-full bg-bulb px-5 text-[15px] font-bold text-ink">
            Get iFound+
          </Link>
        </div>
      ) : (
        <button
          onClick={run}
          disabled={state === "busy"}
          className="mt-4 inline-flex h-12 items-center gap-2 rounded-full bg-bulb px-5 text-[16px] font-bold text-ink disabled:opacity-60"
        >
          {state === "busy" ? "Setting it up…" : "Run it again next week"}
        </button>
      )}
      {state === "error" && <p className="mt-2 text-[14px] text-bulb">{msg}</p>}
    </section>
  );
}

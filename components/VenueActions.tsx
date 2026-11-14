"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function VenueConfirmButton({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  async function confirm() {
    setState("busy");
    const r = await fetch("/api/venue/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => null);
    if (r?.ok) router.push(`/v/manage/${token}?verified=1`);
    else setState("error");
  }
  return (
    <div className="mt-6">
      <button onClick={confirm} disabled={state === "busy"} className="flex h-[52px] w-full items-center justify-center rounded-full bg-bulb text-[17px] font-bold text-ink disabled:opacity-60">
        {state === "busy" ? "Confirming…" : "Confirm"}
      </button>
      {state === "error" && <p className="mt-2 text-[15px] text-danger">This link has expired. Post a plan as this venue again to get a new one.</p>}
    </div>
  );
}

export function VenueCancelButton({ token, code }: { token: string; code: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  async function cancel() {
    setBusy(true);
    await fetch("/api/venue/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, code }) }).catch(() => null);
    setBusy(false);
    setConfirming(false);
    router.refresh();
  }
  return confirming ? (
    <span className="flex flex-wrap gap-2">
      <button onClick={cancel} disabled={busy} className="h-10 rounded-full bg-danger px-4 text-[14px] font-semibold text-white disabled:opacity-60">
        Yes, cancel and tell everyone
      </button>
      <button onClick={() => setConfirming(false)} className="h-10 rounded-full px-3 text-[14px] font-semibold text-ink-2">
        Keep it
      </button>
    </span>
  ) : (
    <button onClick={() => setConfirming(true)} className="h-10 rounded-full border border-line-strong bg-surface px-4 text-[14px] font-semibold">
      Cancel plan
    </button>
  );
}

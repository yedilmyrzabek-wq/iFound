"use client";
import { useState } from "react";

export function PlusButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok && body?.url) {
      window.location.href = body.url;
      return;
    }
    setError(body?.message ?? "Couldn't open checkout. Try again.");
    setBusy(false);
  }
  return (
    <div>
      <button
        onClick={go}
        disabled={busy}
        className="flex h-[52px] w-full items-center justify-center rounded-full bg-bulb text-[18px] font-extrabold text-ink shadow-[0_1px_0_rgb(0_0_0/0.15),0_8px_20px_-8px_rgb(227_164_0/0.8)] hover:bg-[#ffd25c] active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Opening checkout…" : "Get iFound+"}
      </button>
      {error && <p className="mt-2 text-[14px] text-danger">{error}</p>}
    </div>
  );
}

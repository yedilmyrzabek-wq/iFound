"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminButton({ action, id, label, tone = "plain" }: { action: string; id: string; label: string; tone?: "plain" | "danger" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id }) }).catch(() => null);
    setBusy(false);
    router.refresh();
  }
  return (
    <button
      onClick={run}
      disabled={busy}
      className={`h-9 rounded-full px-3 text-[13px] font-semibold disabled:opacity-50 ${
        tone === "danger" ? "bg-danger text-white" : "border border-line-strong bg-surface text-ink"
      }`}
    >
      {busy ? "…" : label}
    </button>
  );
}

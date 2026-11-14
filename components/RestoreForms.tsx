"use client";
import Link from "next/link";
import { useState } from "react";

export function RestoreRequestForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const r = await fetch("/api/billing/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    if (r?.ok) setState("sent");
    else {
      setMsg((await r?.json().catch(() => null))?.message ?? "Something went wrong. Try again.");
      setState("error");
    }
  }
  if (state === "sent")
    return <p className="mt-6 rounded-[10px] bg-surface p-4 text-[16px]">If there's an active iFound+ for {email}, we just emailed a link. Open it on this device — it works for 1 hour.</p>;
  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <label className="block">
        <span className="text-[15px] font-semibold">The email you paid with</span>
        <input
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 block h-12 w-full rounded-[10px] border border-line-strong bg-surface px-3.5 text-[16px] focus:border-ink focus:outline-none"
        />
      </label>
      <button disabled={state === "busy"} className="flex h-[52px] w-full items-center justify-center rounded-full bg-bulb text-[17px] font-bold text-ink disabled:opacity-60">
        {state === "busy" ? "Sending…" : "Email me a link"}
      </button>
      {state === "error" && <p className="text-[15px] text-danger">{msg}</p>}
    </form>
  );
}

export function RestoreConfirmButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  async function go() {
    setState("busy");
    const r = await fetch("/api/billing/restore/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => null);
    setState(r?.ok ? "done" : "error");
  }
  if (state === "done")
    return (
      <div className="mt-6">
        <p className="rounded-[10px] bg-go px-4 py-3 text-[16px] font-semibold text-white">You're in iFound+ on this device.</p>
        <Link href="/c/austin" className="mt-3 inline-flex min-h-11 items-center text-[16px] font-semibold underline">
          See plans in Austin
        </Link>
      </div>
    );
  return (
    <div className="mt-6">
      <button onClick={go} disabled={state === "busy"} className="flex h-[52px] w-full items-center justify-center rounded-full bg-bulb text-[17px] font-bold text-ink disabled:opacity-60">
        {state === "busy" ? "Restoring…" : "Restore on this device"}
      </button>
      {state === "error" && (
        <p className="mt-2 text-[15px] text-danger">
          This link has expired.{" "}
          <Link href="/plus/restore" className="underline">
            Ask for a new one
          </Link>
          .
        </p>
      )}
    </div>
  );
}

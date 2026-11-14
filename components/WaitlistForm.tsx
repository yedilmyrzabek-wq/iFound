"use client";
import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const res = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, city }) }).catch(() => null);
    if (res?.ok) setState("done");
    else {
      setState("error");
      setMsg((await res?.json().catch(() => null))?.message ?? "Couldn't save that. Try again.");
    }
  }

  if (state === "done") return <p className="mt-3 text-[16px] font-medium">Thanks — we'll email you when iFound comes to {city}.</p>;
  const field = "h-12 rounded-[10px] border border-line-strong bg-surface px-3.5 text-[16px] focus:border-ink focus:outline-none";
  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
      <label className="flex-1">
        <span className="sr-only">Email</span>
        <input className={`${field} w-full`} type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label className="sm:w-56">
        <span className="sr-only">City</span>
        <input className={`${field} w-full`} required minLength={2} maxLength={60} placeholder="Your city" value={city} onChange={(e) => setCity(e.target.value)} />
      </label>
      <button disabled={state === "busy"} className="h-12 rounded-full bg-ink px-6 text-[16px] font-bold text-white disabled:opacity-60">
        Let me know
      </button>
      {state === "error" && <p className="text-[14px] text-danger sm:self-center">{msg}</p>}
    </form>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";

export function LeaveButton({ token, code }: { token: string; code: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function leave() {
    setState("busy");
    const res = await fetch("/api/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => null);
    if (res?.ok) setState("done");
    else {
      setMsg((await res?.json().catch(() => null))?.message ?? "Something went wrong. Please try again.");
      setState("error");
    }
  }

  if (state === "done")
    return (
      <div className="mt-6">
        <p className="text-[17px] font-semibold">You're out. We let the plan know there's a free spot.</p>
        <Link href={`/e/${code}`} className="mt-3 inline-flex min-h-11 items-center text-[16px] font-semibold underline">
          Back to the plan
        </Link>
      </div>
    );
  return (
    <div className="mt-6">
      <button onClick={leave} disabled={state === "busy"} className="flex h-[52px] w-full items-center justify-center rounded-full bg-ink text-[17px] font-bold text-white disabled:opacity-60">
        {state === "busy" ? "Leaving…" : "Leave"}
      </button>
      <Link href={`/e/${code}`} className="mt-2 flex h-12 items-center justify-center text-[16px] font-semibold text-ink-2">
        Keep my spot
      </Link>
      {state === "error" && <p className="mt-2 text-[15px] text-danger">{msg}</p>}
    </div>
  );
}

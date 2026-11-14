"use client";
// Bottom sheet on phones, centered dialog on wide screens. Three fields, then you're in.
import { useEffect, useRef, useState } from "react";
import { joinSchema } from "@/lib/validation";
import type { ApiError, JoinResponse } from "@/lib/types";
import { Icon } from "./Icon";

export function JoinSheet({
  code,
  title,
  onClose,
  onJoined,
}: {
  code: string;
  title: string;
  onClose: () => void;
  onJoined: (r: JoinResponse) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [is18, setIs18] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = joinSchema.safeParse({ name, email, photoPath: null, is18 });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json()) as JoinResponse | ApiError;
      if (!res.ok || "error" in body) {
        setFormError((body as ApiError).message ?? "Something went wrong. Please try again.");
        return;
      }
      onJoined(body);
    } catch {
      setFormError("No connection. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "mt-1.5 block h-12 w-full rounded-[10px] border border-line-strong bg-surface px-3.5 text-[16px] text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10";

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="join-title">
      <button type="button" aria-label="Close" onClick={onClose} className="fade-in absolute inset-0 bg-ink/45" />
      <form
        onSubmit={submit}
        noValidate
        className="sheet-in relative w-full max-w-md rounded-t-[20px] bg-surface px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-[var(--shadow-sheet)] sm:rounded-[16px] sm:pb-6"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="join-title" className="text-[22px] leading-tight font-bold">
              Count me in
            </h2>
            <p className="mt-1 text-[15px] text-ink-2">{title}</p>
          </div>
          <button type="button" onClick={onClose} className="-mt-1 -mr-2 inline-flex size-11 items-center justify-center rounded-full text-ink-2 hover:bg-black/5" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-[15px] font-semibold">First name</span>
            <input
              ref={firstField}
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              maxLength={30}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "err-name" : undefined}
            />
            {errors.name && <span id="err-name" className="mt-1 block text-[14px] text-danger">{errors.name}</span>}
          </label>
          <label className="block">
            <span className="text-[15px] font-semibold">Email</span>
            <input
              className={field}
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby="email-hint"
            />
            <span id="email-hint" className={`mt-1 block text-[14px] ${errors.email ? "text-danger" : "text-ink-2"}`}>
              {errors.email ?? "We'll only email you about this plan"}
            </span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={is18}
              onChange={(e) => setIs18(e.target.checked)}
              className="size-5 shrink-0 accent-[#16171a]"
              aria-invalid={!!errors.is18}
            />
            <span className="text-[15px]">I'm 18 or older</span>
          </label>
          {errors.is18 && <span className="-mt-2 block text-[14px] text-danger">{errors.is18}</span>}
        </div>

        {formError && (
          <p role="alert" className="mt-4 rounded-[10px] bg-[#fdecea] px-3.5 py-3 text-[15px] text-danger">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 flex h-[52px] w-full items-center justify-center rounded-full bg-bulb text-[17px] font-bold text-ink shadow-[0_1px_0_rgb(0_0_0/0.15),0_6px_16px_-6px_rgb(227_164_0/0.7)] transition-[transform,background-color] hover:bg-[#ffd25c] active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? "Counting you in…" : "Count me in"}
        </button>
        <p className="mt-3 text-center text-[13px] text-ink-3">No account needed. Your name is shown only to people in this plan.</p>
      </form>
    </div>
  );
}

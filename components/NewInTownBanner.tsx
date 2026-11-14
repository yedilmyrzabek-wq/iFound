"use client";
// One-time hint for people new to the city. Dismissal is remembered in this browser only.
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const KEY = "ifound_newin_dismissed";

export function NewInTownBanner({ city }: { city: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(localStorage.getItem(KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;
  return (
    <div className="fade-in mt-4 flex items-start gap-3 rounded-[12px] border border-bulb-deep/50 bg-[#fff8e3] px-4 py-3">
      <p className="flex-1 text-[15px] leading-snug">
        <span className="font-bold">New in {city}?</span> Every plan here only happens if enough people come. Start with one that's 1 away.
      </p>
      <button
        onClick={() => {
          setShow(false);
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            /* private mode */
          }
        }}
        aria-label="Dismiss"
        className="-mt-1 -mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-black/5"
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}

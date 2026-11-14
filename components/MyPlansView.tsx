"use client";
import Link from "next/link";
import { DateTime } from "luxon";
import { useState } from "react";
import type { MyPlan } from "@/lib/me";
import { EventCard } from "./EventCard";
import { useNow } from "./useNow";

type Data = {
  going: MyPlan[];
  hosting: MyPlan[];
  past: MyPlan[];
  plus: { active: boolean; until: string | null };
  profile: { name: string; email: string; photoPath: string | null } | null;
};
const TABS = [
  { k: "going", label: "Going" },
  { k: "hosting", label: "Hosting" },
  { k: "past", label: "Past" },
] as const;

export function MyPlansView({ data, serverNow }: { data: Data; serverNow: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["k"]>(data.going.length || !data.hosting.length ? "going" : "hosting");
  const now = useNow(serverNow);
  const [profile, setProfile] = useState(data.profile);
  const list = data[tab];
  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-16">
      <h1 className="text-[32px] leading-none font-extrabold tracking-[-0.02em]">My plans</h1>
      <p className="mt-3 text-[15px] text-ink-2">
        {data.plus.active ? (
          <span className="font-semibold text-ink">
            iFound+ active{data.plus.until ? ` until ${DateTime.fromISO(data.plus.until).toFormat("LLL d")}` : ""}
          </span>
        ) : (
          <>
            <Link href="/plus" className="font-semibold text-ink underline">
              Get iFound+
            </Link>
            {" · "}
            <Link href="/plus/restore" className="font-semibold text-ink underline">
              Restore iFound+
            </Link>
          </>
        )}
      </p>

      <div role="tablist" aria-label="My plans" className="mt-5 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.k}
            role="tab"
            aria-selected={tab === t.k}
            onClick={() => setTab(t.k)}
            className={`-mb-px flex h-11 items-center gap-1.5 border-b-2 px-3 text-[16px] font-semibold ${
              tab === t.k ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {t.label}
            <span className="rounded-full bg-[#e4e6e1] px-1.5 text-[12px] text-ink-2">{data[t.k].length}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-4">
        {list.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line-strong bg-surface px-5 py-8 text-center">
            <p className="text-[17px] font-semibold">
              {tab === "going" ? "You haven't joined a plan yet." : tab === "hosting" ? "You're not hosting anything yet." : "Nothing here yet."}
            </p>
            <Link href={tab === "hosting" ? "/new" : "/c/austin"} className="mt-4 inline-flex h-11 items-center rounded-full bg-bulb px-5 text-[16px] font-bold text-ink">
              {tab === "hosting" ? "Start a plan" : "Find a plan"}
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((p) => (
              <li key={p.code}>
                <EventCard e={p} timezone={p.timezone} now={now} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-8 text-[14px] text-ink-2">Your plans are saved in this browser. Switched browsers? Use the links in your emails.</p>
      {profile && (
        <p className="mt-2 text-[14px] text-ink-2">
          Joining as <span className="font-semibold text-ink">{profile.name}</span> ({profile.email}).{" "}
          <button
            className="font-semibold text-ink underline"
            onClick={async () => {
              await fetch("/api/me/profile", { method: "DELETE" }).catch(() => null);
              setProfile(null);
            }}
          >
            Not you? Clear
          </button>
        </p>
      )}
    </main>
  );
}

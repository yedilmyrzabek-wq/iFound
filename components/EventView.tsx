"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import useSWR from "swr";
import { ACTIVITY_META } from "@/lib/activities";
import { formatDeadline, formatRange, formatRelative, formatViewerLocal } from "@/lib/tz";
import type { EventDetail, JoinResponse, MeProfile } from "@/lib/types";
import { Avatar, LockedAvatar } from "./Avatar";
import { Counter } from "./Counter";
import { Icon } from "./Icon";
import { JoinSheet } from "./JoinSheet";
import { DemoChip, StatusChip } from "./StatusChip";
import { MapView } from "./map";
import { useNow, useViewerZone } from "./useNow";
import { ReportButton } from "./ReportButton";

const fetcher = async (url: string) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return (await r.json()).event as EventDetail;
};

export function EventView({
  initial,
  serverNow,
  justCreated,
  profile = null,
}: {
  initial: EventDetail;
  serverNow: string;
  justCreated: boolean;
  profile?: MeProfile | null;
}) {
  const { data, mutate } = useSWR(`/api/events/${initial.code}`, fetcher, {
    fallbackData: initial,
    refreshInterval: 8000,
    revalidateOnFocus: true,
  });
  const e = data ?? initial;
  const now = useNow(serverNow);
  const zone = useViewerZone();
  const [sheet, setSheet] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"leave" | "cancel" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const closeSheet = useCallback(() => setSheet(false), []);
  const onJoined = useCallback(
    async (r: JoinResponse) => {
      setSheet(false);
      if (r.justConfirmed) setCelebrate(true);
      else setToast(r.status === "confirmed" ? "You're in — it's on!" : "You're in ✓ We emailed you the details.");
      await mutate();
    },
    [mutate],
  );

  async function post(path: string) {
    setActionError(null);
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      setActionError(b?.message ?? "Something went wrong. Please try again.");
    }
    setConfirming(null);
    await mutate();
  }

  const open = e.status === "filling" || e.status === "confirmed";
  const viewerLocal = zone ? formatViewerLocal(e.startsAt, e.timezone, zone) : null;
  const needed = Math.max(e.minPeople - e.count, 0);
  const others = (e.participants ?? []).filter((p) => !p.isHost);
  const hiddenCount = Math.max(e.count - (e.host ? 1 : 0), 0);
  const url = typeof window !== "undefined" ? window.location.origin + `/e/${e.code}` : `/e/${e.code}`;

  async function share() {
    const text = e.status === "filling" ? `${e.title} — it needs ${needed} more. Tap I'm in:` : `${e.title} — it's on. Join us:`;
    try {
      if (navigator.share) {
        await navigator.share({ title: e.title, text, url });
        return;
      }
    } catch {
      return; // user dismissed the share sheet
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied");
    } catch {
      setToast(url);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-3 pb-36 sm:pb-16">
      <nav aria-label="Breadcrumb" className="text-[14px] text-ink-2">
        <Link href={`/c/${e.citySlug}`} className="inline-flex min-h-11 items-center gap-1 hover:text-ink">
          <Icon name="back" size={16} />
          {e.cityName}
        </Link>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={e.status} isFull={e.isFull} />
        {e.isDemo && <DemoChip />}
      </div>
      <h1 className="mt-2 text-[28px] leading-[1.12] font-extrabold tracking-[-0.02em] sm:text-[34px]">
        <span className="mr-2" aria-hidden="true">
          {ACTIVITY_META[e.activity].emoji}
        </span>
        {e.title}
      </h1>

      {justCreated && e.status === "filling" && e.viewer.role === "host" && (
        <div className="mt-4 flex items-center gap-3 rounded-[10px] border border-bulb-deep/40 bg-[#fff6dc] p-3.5">
          <p className="flex-1 text-[15px] font-medium">
            Share it — it needs {needed} more {needed === 1 ? "person" : "people"}.
          </p>
          <button onClick={share} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-[15px] font-semibold text-white">
            <Icon name="share" size={18} /> Share
          </button>
        </div>
      )}

      <div className="relative mt-4">
        <Counter status={e.status} cancelReason={e.cancelReason} count={e.count} min={e.minPeople} max={e.maxPeople} celebrate={celebrate} />
        {celebrate && (
          <div className="fade-in mt-3 rounded-[10px] bg-go px-4 py-3.5 text-white" role="status">
            <p className="text-[19px] font-extrabold">You made it happen — it's on!</p>
            <p className="mt-0.5 text-[15px] text-white/90">Everyone's getting the "It's on" email with a calendar invite.</p>
          </div>
        )}
      </div>

      {e.status === "filling" && (
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          If it doesn't reach {e.minPeople} by <span className="font-semibold text-ink">{formatDeadline(e.fillDeadline, e.timezone)}</span>, it's
          called off and everyone's notified.
        </p>
      )}
      {e.status === "cancelled" && (
        <p className="mt-3 rounded-[10px] bg-[#e4e6e1] px-4 py-3 text-[15px] font-medium text-ink">
          {e.cancelReason === "unfilled" ? "Didn't fill — called off. Nobody showed up alone." : "The host called this off."}
        </p>
      )}
      {e.status === "completed" && <p className="mt-3 rounded-[10px] bg-[#e4e6e1] px-4 py-3 text-[15px] font-medium">This plan already happened.</p>}

      <dl className="mt-6 divide-y divide-line border-y border-line">
        <div className="flex gap-3 py-4">
          <dt className="pt-0.5 text-ink-2">
            <Icon name="clock" />
            <span className="sr-only">When</span>
          </dt>
          <dd>
            <p className="text-[16px] font-semibold">{formatRange(e.startsAt, e.durationMinutes, e.timezone)}</p>
            <p className="text-[15px] text-ink-2">{formatRelative(e.startsAt, now)}</p>
            {viewerLocal && <p className="mt-0.5 text-[14px] text-ink-3">{viewerLocal}</p>}
          </dd>
        </div>
        <div className="flex gap-3 py-4">
          <dt className="pt-0.5 text-ink-2">
            <Icon name="pin" />
            <span className="sr-only">Where</span>
          </dt>
          <dd className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold">{e.place.name}</p>
            {e.place.address && <p className="text-[15px] text-ink-2">{e.place.address}</p>}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${e.place.lat},${e.place.lng}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold underline"
            >
              Open in Google Maps <Icon name="external" size={15} />
            </a>
            <div className="mt-2 h-40 overflow-hidden rounded-[10px] border border-line">
              <MapView center={[e.place.lat, e.place.lng]} zoom={15} interactive={false} pins={[{ id: "p", lat: e.place.lat, lng: e.place.lng, selected: true }]} />
            </div>
          </dd>
        </div>
      </dl>

      {e.description && <p className="mt-5 text-[16px] leading-relaxed whitespace-pre-line">{e.description}</p>}

      <section className="mt-6" aria-labelledby="who">
        <h2 id="who" className="text-[18px] font-bold">
          Who's going
        </h2>
        <div className="mt-3 flex items-center gap-3">
          {e.host ? (
            <>
              <Avatar name={e.host.name} photoUrl={e.host.photoUrl} size={44} />
              <p className="text-[15px]">
                Hosted by <span className="font-semibold">{e.host.name}</span>
              </p>
            </>
          ) : (
            <p className="text-[15px]">
              Hosted by <span className="font-semibold">{e.hostVenueName ?? e.place.name}</span>
              {e.hostVenueName && " ✓"}
            </p>
          )}
        </div>

        {e.participants ? (
          others.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-3">
              {others.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <Avatar name={p.name} photoUrl={p.photoUrl} size={36} />
                  <span className="text-[15px]">{p.name}</span>
                </li>
              ))}
            </ul>
          )
        ) : hiddenCount > 0 ? (
          <div className="mt-4">
            <div className="flex -space-x-2">
              {Array.from({ length: Math.min(hiddenCount, 8) }, (_, i) => (
                <LockedAvatar key={i} size={36} />
              ))}
              {hiddenCount > 8 && <span className="pl-4 text-[15px] text-ink-2">+{hiddenCount - 8}</span>}
            </div>
            <p className="mt-2 text-[15px] text-ink-2">
              See who's going — join the plan or{" "}
              <Link href="/plus" className="font-semibold text-ink underline">
                get iFound+
              </Link>
            </p>
          </div>
        ) : null}
      </section>

      {actionError && (
        <p role="alert" className="mt-4 rounded-[10px] bg-[#fdecea] px-3.5 py-3 text-[15px] text-danger">
          {actionError}
        </p>
      )}

      {/* Secondary actions for people already in */}
      {e.viewer.role !== "guest" && open && (
        <div className="mt-6 flex flex-wrap gap-2">
          {e.status === "confirmed" && (
            <a href={`/api/events/${e.code}/ics`} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-[15px] font-semibold">
              <Icon name="calendar" size={18} /> Add to calendar
            </a>
          )}
          {e.viewer.role === "participant" &&
            (confirming === "leave" ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                <button onClick={() => post(`/api/events/${e.code}/leave`)} className="h-11 rounded-full bg-ink px-4 text-[15px] font-semibold text-white">
                  Yes, I can't make it
                </button>
                <button onClick={() => setConfirming(null)} className="h-11 rounded-full px-3 text-[15px] font-semibold text-ink-2">
                  Keep my spot
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirming("leave")} className="h-11 rounded-full border border-line-strong bg-surface px-4 text-[15px] font-semibold">
                Can't make it
              </button>
            ))}
          {e.viewer.role === "host" &&
            (confirming === "cancel" ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                <button onClick={() => post(`/api/events/${e.code}/cancel`)} className="h-11 rounded-full bg-danger px-4 text-[15px] font-semibold text-white">
                  Yes, cancel and tell everyone
                </button>
                <button onClick={() => setConfirming(null)} className="h-11 rounded-full px-3 text-[15px] font-semibold text-ink-2">
                  Keep it
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirming("cancel")} className="h-11 rounded-full border border-line-strong bg-surface px-4 text-[15px] font-semibold">
                Cancel plan
              </button>
            ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <ReportButton code={e.code} />
      </div>

      {/* Primary action, pinned to the thumb zone */}
      <div className="fixed inset-x-0 bottom-0 z-[900] border-t border-line bg-ground/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-sm sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          {e.viewer.role === "host" ? (
            <p className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-[#e4e6e1] text-[16px] font-semibold">You're hosting</p>
          ) : e.viewer.role === "participant" ? (
            <p className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-go text-[16px] font-bold text-white">
              <Icon name="check" size={20} /> You're in ✓
            </p>
          ) : e.viewer.canJoin ? (
            <button
              onClick={() => setSheet(true)}
              className="flex h-[52px] flex-1 items-center justify-center rounded-full bg-bulb text-[18px] font-extrabold text-ink shadow-[0_1px_0_rgb(0_0_0/0.15),0_8px_20px_-8px_rgb(227_164_0/0.8)] transition-[transform,background-color] hover:bg-[#ffd25c] active:scale-[0.98]"
            >
              I'm in
            </button>
          ) : e.isFull && open ? (
            <button disabled className="flex h-[52px] flex-1 items-center justify-center rounded-full bg-[#e4e6e1] text-[17px] font-bold text-ink-3">
              Full
            </button>
          ) : (
            <Link href={`/new?city=${e.citySlug}`} className="flex h-[52px] flex-1 items-center justify-center rounded-full bg-ink text-[16px] font-bold text-white">
              Start a plan
            </Link>
          )}
          {open && (
            <button onClick={share} aria-label="Share" className="inline-flex size-[52px] shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface">
              <Icon name="share" />
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fade-in fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-[950] mx-auto max-w-sm rounded-[10px] bg-ink px-4 py-3 text-center text-[15px] font-medium text-white shadow-[var(--shadow-lift)] sm:bottom-8"
          onAnimationEnd={() => setTimeout(() => setToast(null), 3200)}
        >
          {toast}
        </div>
      )}

      {sheet && <JoinSheet code={e.code} title={e.title} profile={profile} onClose={closeSheet} onJoined={onJoined} />}
    </main>
  );
}

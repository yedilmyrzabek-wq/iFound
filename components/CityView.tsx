"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { ACTIVITY_META, CATEGORY_LABEL } from "@/lib/activities";
import { formatCard, zoneLongName } from "@/lib/tz";
import { ACTIVITIES, type Activity, type DayFilter, type DeckResponse, type EventSummary, type MeProfile, type Venue } from "@/lib/types";
import { SwipeDeck } from "./SwipeDeck";
import { EventCard } from "./EventCard";
import { Icon } from "./Icon";
import { MapView, type MapPin } from "./map";
import { useNow } from "./useNow";

const DAYS: { v: DayFilter; label: string }[] = [
  { v: "all", label: "All upcoming" },
  { v: "today", label: "Today" },
  { v: "tomorrow", label: "Tomorrow" },
  { v: "weekend", label: "This weekend" },
];

const fetcher = async (url: string) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return (await r.json()).events as EventSummary[];
};

interface CityInfo {
  slug: string;
  name: string;
  timezone: string;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
}

type View = "auto" | "swipe" | "list" | "map";

export function CityView({
  city,
  venues,
  initial,
  serverNow,
  deck,
  profile,
  initialView,
}: {
  city: CityInfo;
  venues: Venue[];
  initial: EventSummary[];
  serverNow: string;
  deck: DeckResponse;
  profile: MeProfile | null;
  initialView: View;
}) {
  const [day, setDay] = useState<DayFilter>("all");
  const [acts, setActs] = useState<Activity[]>([]);
  // "auto": Swipe on phones, List on desktop (TZ §8.12). Any explicit pick wins on every screen size.
  const [view, setView] = useState<View>(initialView);
  const now = useNow(serverNow);
  const key = `/api/events?city=${city.slug}&day=${day}${acts.length ? `&activity=${acts.join(",")}` : ""}`;
  const isDefault = day === "all" && acts.length === 0;
  const { data, isLoading } = useSWR(key, fetcher, {
    refreshInterval: 30_000,
    fallbackData: isDefault ? initial : undefined,
    keepPreviousData: true,
  });
  const events = data ?? [];
  const shortCity = city.name.split(",")[0];

  const pins: MapPin[] = useMemo(() => {
    const byVenue = new Map<string, EventSummary[]>();
    for (const e of events) if (e.place.venueId) byVenue.set(e.place.venueId, [...(byVenue.get(e.place.venueId) ?? []), e]);
    const venuePins = venues.map<MapPin>((v) => {
      const list = byVenue.get(v.id) ?? [];
      return {
        id: v.id,
        lat: v.lat,
        lng: v.lng,
        count: list.length,
        title: v.name,
        popup: (
          <div className="min-w-[200px]">
            <p className="text-[15px] font-bold text-ink">{v.name}</p>
            <p className="text-[13px] text-ink-2">{CATEGORY_LABEL[v.category]}{v.address ? ` · ${v.address}` : ""}</p>
            {list.length > 0 && (
              <ul className="mt-2 space-y-1">
                {list.map((e) => (
                  <li key={e.code}>
                    <Link href={`/e/${e.code}`} className="text-[14px] font-semibold text-ink underline">
                      {e.title}
                    </Link>
                    <span className="block text-[13px] text-ink-2">
                      {formatCard(e.startsAt, city.timezone)} · {e.count} of {e.minPeople}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/new?venue=${v.id}`} className="mt-2 inline-block text-[14px] font-semibold text-ink underline">
              Start a plan here
            </Link>
          </div>
        ),
      };
    });
    const customPins = events
      .filter((e) => !e.place.venueId)
      .map<MapPin>((e) => ({
        id: `e-${e.code}`,
        lat: e.place.lat,
        lng: e.place.lng,
        count: 1,
        title: e.place.name,
        popup: (
          <div>
            <p className="text-[15px] font-bold text-ink">{e.place.name}</p>
            <Link href={`/e/${e.code}`} className="text-[14px] font-semibold text-ink underline">
              {e.title}
            </Link>
          </div>
        ),
      }));
    return [...venuePins, ...customPins];
  }, [venues, events, city.timezone]);

  function toggle(a: Activity) {
    setActs((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  }

  const chip = (active: boolean) =>
    `inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[15px] font-medium transition-colors ${
      active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink hover:border-ink/50"
    }`;

  return (
    <main className="mx-auto max-w-6xl px-4 pt-5 pb-28">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[32px] leading-none font-extrabold tracking-[-0.02em] sm:text-[40px]">{city.name}</h1>
          <p className="mt-2 text-[15px] text-ink-2">Times shown in {zoneLongName(city.timezone)}</p>
        </div>
        <Link
          href={`/new?city=${city.slug}`}
          className="hidden h-11 items-center gap-2 rounded-full bg-bulb px-5 text-[16px] font-bold text-ink shadow-[0_1px_0_rgb(0_0_0/0.15)] hover:bg-[#ffd25c] sm:inline-flex"
        >
          <Icon name="plus" size={18} /> Start a plan
        </Link>
      </div>

      <div role="tablist" aria-label="View" className="mt-5 inline-flex rounded-full border border-line-strong bg-surface p-1">
        {(["swipe", "list", "map"] as const).map((v) => {
          const active = view === v || (view === "auto" && v === "swipe");
          const activeDesktop = view === v || (view === "auto" && v === "list");
          return (
            <button
              key={v}
              role="tab"
              aria-selected={active}
              onClick={() => setView(v)}
              className={`h-10 rounded-full px-4 text-[15px] font-semibold capitalize ${v === "map" ? "lg:hidden" : ""} ${
                active ? "bg-ink text-white" : "text-ink-2"
              } ${activeDesktop ? "lg:bg-ink lg:text-white" : "lg:bg-transparent lg:text-ink-2"}`}
            >
              {v}
            </button>
          );
        })}
      </div>

      {(view === "swipe" || view === "auto") && (
        <div className={`mt-5 ${view === "auto" ? "lg:hidden" : ""}`}>
          <SwipeDeck city={city} initial={deck} initialProfile={profile} first={null} serverNow={serverNow} />
        </div>
      )}

      <div className={view === "swipe" ? "hidden" : view === "auto" ? "hidden lg:block" : ""}>
      <div className="-mx-4 mt-5 overflow-x-auto px-4 [scrollbar-width:none]">
        <div role="radiogroup" aria-label="Day" className="flex gap-2">
          {DAYS.map((d) => (
            <button key={d.v} role="radio" aria-checked={day === d.v} onClick={() => setDay(d.v)} className={chip(day === d.v)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="-mx-4 mt-2 overflow-x-auto px-4 [scrollbar-width:none]">
        <div aria-label="Activities" className="flex gap-2">
          {ACTIVITIES.map((a) => (
            <button key={a} aria-pressed={acts.includes(a)} onClick={() => toggle(a)} className={chip(acts.includes(a))}>
              <span aria-hidden="true">{ACTIVITY_META[a].emoji}</span>
              {ACTIVITY_META[a].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <section aria-label="Plans" className={view === "map" ? "hidden lg:block" : ""}>
          <p className="mb-3 text-[14px] font-medium text-ink-2" aria-live="polite">
            {isLoading && !data ? "Loading plans…" : `${events.length} open ${events.length === 1 ? "plan" : "plans"}`}
          </p>
          {events.length === 0 && !isLoading ? (
            <div className="rounded-[10px] border border-dashed border-line-strong bg-surface px-5 py-8 text-center">
              <p className="text-[17px] font-semibold">
                {isDefault ? `No plans in ${shortCity} yet.` : "Nothing matches these filters."}
              </p>
              <p className="mt-1 text-[15px] text-ink-2">Start one — it only happens if people join.</p>
              <Link href={`/new?city=${city.slug}`} className="mt-4 inline-flex h-11 items-center rounded-full bg-bulb px-5 text-[16px] font-bold text-ink">
                Start a plan
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.code}>
                  <EventCard e={e} timezone={city.timezone} now={now} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-label="Map of places"
          className={`${view === "list" || view === "auto" ? "hidden lg:block" : ""} h-[calc(100dvh-230px)] min-h-[360px] overflow-hidden rounded-[10px] border border-line lg:sticky lg:top-20 lg:h-[calc(100dvh-110px)]`}
        >
          <MapView center={[city.centerLat, city.centerLng]} zoom={city.defaultZoom} pins={pins} />
        </section>
      </div>

      </div>

      {/* Mobile: start a plan, in the thumb zone (hidden on swipe, which has its own controls) */}
      {view !== "swipe" && view !== "auto" && (
        <div className="fixed inset-x-0 bottom-0 z-[900] border-t border-line bg-ground/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-sm lg:hidden">
          <Link href={`/new?city=${city.slug}`} className="flex h-[52px] items-center justify-center gap-2 rounded-full bg-bulb text-[17px] font-bold text-ink">
            <Icon name="plus" size={18} /> Start a plan
          </Link>
        </div>
      )}
    </main>
  );
}

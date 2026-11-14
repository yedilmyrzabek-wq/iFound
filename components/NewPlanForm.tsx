"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ACTIVITY_META, CATEGORY_LABEL, SUGGESTED_CATEGORIES, activityLabel } from "@/lib/activities";
import { zoneLongName } from "@/lib/tz";
import { createEventSchema, defaultMax } from "@/lib/validation";
import { ACTIVITIES, DURATIONS, type Activity, type ApiError, type CreateEventResponse, type Venue } from "@/lib/types";
import { Icon } from "./Icon";
import { PhotoPicker } from "./PhotoPicker";
import { MapView, type MapPin } from "./map";

interface CityInfo {
  slug: string;
  name: string;
  timezone: string;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
}

const TIMES = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  const v = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const label = `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  return { v, label };
});

const DURATION_LABEL: Record<number, string> = { 60: "1 hour", 90: "1.5 hours", 120: "2 hours", 180: "3 hours" };

export function NewPlanForm({
  city,
  cities,
  venues,
  preVenueId,
  bounds,
  asVenueDefault = false,
  admin = false,
}: {
  city: CityInfo;
  cities: { slug: string; name: string }[];
  venues: Venue[];
  preVenueId: string | null;
  bounds: { min: string; max: string };
  asVenueDefault?: boolean;
  admin?: boolean;
}) {
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [activityOther, setActivityOther] = useState("");
  const [venueId, setVenueId] = useState<string | null>(preVenueId);
  const [custom, setCustom] = useState<{ lat: number; lng: number } | null>(null);
  const [customName, setCustomName] = useState("");
  const [somewhereElse, setSomewhereElse] = useState(false);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(bounds.min.slice(0, 10));
  const [time, setTime] = useState("19:00");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(120);
  const [min, setMin] = useState(6);
  const [max, setMax] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [is18, setIs18] = useState(false);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [asVenue, setAsVenue] = useState(asVenueDefault && !!preVenueId);
  const [venueEmail, setVenueEmail] = useState("");
  const [isDemo, setIsDemo] = useState(admin);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [busy, setBusy] = useState(false);

  const effectiveMax = max ?? defaultMax(min);
  const venue = venues.find((v) => v.id === venueId) ?? null;
  const placeName = venue ? venue.name : customName.trim();

  const sortedVenues = useMemo(() => {
    const q = query.trim().toLowerCase();
    const suggested = activity ? SUGGESTED_CATEGORIES[activity] : [];
    return venues
      .filter((v) => !q || v.name.toLowerCase().includes(q) || (v.address ?? "").toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = suggested.indexOf(a.category);
        const sb = suggested.indexOf(b.category);
        const ra = sa === -1 ? 99 : sa;
        const rb = sb === -1 ? 99 : sb;
        return ra - rb || a.name.localeCompare(b.name);
      });
  }, [venues, query, activity]);

  const pins: MapPin[] = useMemo(() => {
    if (somewhereElse) return custom ? [{ id: "custom", ...custom, selected: true }] : [];
    return venues.map((v) => ({ id: v.id, lat: v.lat, lng: v.lng, selected: v.id === venueId, title: v.name }));
  }, [venues, venueId, somewhereElse, custom]);

  const local = `${date}T${time}`;
  const timeError = !date ? "Pick a date" : local < bounds.min ? "Pick a time at least 3 hours from now" : local > bounds.max ? "Pick a date within the next 30 days" : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const body = {
      city: city.slug,
      venueId: somewhereElse ? null : venueId,
      place: somewhereElse && custom ? { name: customName, lat: custom.lat, lng: custom.lng } : null,
      activity,
      activityOther: activity === "other" ? activityOther : null,
      title,
      description,
      startsAtLocal: local,
      durationMinutes: duration,
      minPeople: min,
      maxPeople: effectiveMax,
      host: { name, email, photoPath, is18 },
      isDemo: admin && isDemo,
      asVenue: { enabled: asVenue && !somewhereElse && !!venueId, email: asVenue && !somewhereElse && venueId ? venueEmail : null },
    };
    const parsed = createEventSchema.safeParse(body);
    const errs: Record<string, string> = {};
    if (!activity) errs.activity = "Pick what you're doing";
    if (timeError) errs.when = timeError;
    if (somewhereElse && !custom) errs.place = "Tap the map to drop a pin";
    if (!parsed.success) {
      for (const i of parsed.error.issues) {
        const k = i.path[0] === "host" ? String(i.path[1]) : String(i.path[0]);
        errs[k] ??= i.message;
      }
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      document.querySelector(`[data-field="${Object.keys(errs)[0]}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const out = (await res.json()) as CreateEventResponse | ApiError;
      if (res.status === 402) {
        setPaywall(true);
        return;
      }
      if (!res.ok || "error" in out) {
        setFormError((out as ApiError).message ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(`${out.url}?new=1`);
    } catch {
      setFormError("No connection. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "block h-12 w-full rounded-[10px] border border-line-strong bg-surface px-3.5 text-[16px] text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10";
  const err = (k: string) => errors[k] && <p className="mt-1.5 text-[14px] text-danger">{errors[k]}</p>;
  const zoneName = `${zoneLongName(city.timezone)} (${city.name.split(",")[0]})`;
  const generatedTitle = activity && placeName ? `${activityLabel(activity, activityOther || null)} at ${placeName}` : "";

  return (
    <main className="mx-auto max-w-2xl px-4 pt-5 pb-32">
      <h1 className="text-[32px] leading-none font-extrabold tracking-[-0.02em]">Start a plan</h1>
      <p className="mt-2 text-[16px] text-ink-2">It only happens if enough people are in. If not, it's quietly called off.</p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-9">
        <section>
          <label className="block">
            <span className="text-[18px] font-bold">City</span>
            <select
              value={city.slug}
              onChange={(e) => router.push(`/new?city=${e.target.value}`)}
              className={`${field} mt-2 appearance-none`}
            >
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section data-field="activity">
          <h2 className="text-[18px] font-bold">What</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Activity">
            {ACTIVITIES.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={activity === a}
                onClick={() => setActivity(a)}
                className={`flex h-[76px] flex-col items-center justify-center gap-1 rounded-[10px] border text-[15px] font-semibold transition-colors ${
                  activity === a ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:border-ink/50"
                }`}
              >
                <span className="text-[24px] leading-none" aria-hidden="true">
                  {ACTIVITY_META[a].emoji}
                </span>
                {ACTIVITY_META[a].label}
              </button>
            ))}
          </div>
          {activity === "other" && (
            <input
              className={`${field} mt-3`}
              placeholder="What are you doing? e.g. Pickleball"
              maxLength={40}
              value={activityOther}
              onChange={(e) => setActivityOther(e.target.value)}
              aria-label="Your activity"
            />
          )}
          {err("activity")}
          {err("activityOther")}
        </section>

        <section data-field="place">
          <h2 className="text-[18px] font-bold">Where</h2>
          {!somewhereElse ? (
            <>
              <div className="relative mt-3">
                <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" />
                <input className={`${field} pl-10`} placeholder={`Search places in ${city.name.split(",")[0]}`} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search places" />
              </div>
              <ul className="mt-2 max-h-64 divide-y divide-line overflow-y-auto rounded-[10px] border border-line bg-surface">
                {sortedVenues.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setVenueId(v.id)}
                      aria-pressed={venueId === v.id}
                      className={`flex min-h-[52px] w-full items-center gap-3 px-3.5 py-2 text-left ${venueId === v.id ? "bg-[#fff6dc]" : "hover:bg-black/[0.03]"}`}
                    >
                      <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${venueId === v.id ? "border-ink bg-ink text-white" : "border-line-strong"}`}>
                        {venueId === v.id && <Icon name="check" size={12} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold">{v.name}</span>
                        <span className="block truncate text-[13px] text-ink-2">
                          {CATEGORY_LABEL[v.category]}
                          {v.address ? ` · ${v.address}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                {sortedVenues.length === 0 && <li className="px-3.5 py-4 text-[15px] text-ink-2">No listed place matches. Try “Somewhere else”.</li>}
              </ul>
            </>
          ) : (
            <div className="mt-3">
              <input
                className={field}
                placeholder="Name the spot, e.g. Zilker Park — near the lawn"
                maxLength={60}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                aria-label="Place name"
              />
              <p className="mt-1.5 text-[14px] text-ink-2">Tap the map to drop a pin where you'll meet.</p>
            </div>
          )}
          <div className="mt-3 h-56 overflow-hidden rounded-[10px] border border-line">
            <MapView
              center={[venue?.lat ?? city.centerLat, venue?.lng ?? city.centerLng]}
              zoom={city.defaultZoom}
              pins={pins}
              onPinClick={somewhereElse ? undefined : (id) => setVenueId(id)}
              onMapClick={somewhereElse ? (lat, lng) => setCustom({ lat, lng }) : undefined}
              focus={venue ? { lat: venue.lat, lng: venue.lng } : null}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSomewhereElse(!somewhereElse);
              setVenueId(null);
            }}
            className="mt-2 inline-flex min-h-11 items-center text-[15px] font-semibold underline"
          >
            {somewhereElse ? "Pick a listed place instead" : "Somewhere else"}
          </button>
          {err("place")}
        </section>

        <section data-field="when">
          <h2 className="text-[18px] font-bold">When</h2>
          <p className="mt-1 text-[14px] font-medium text-ink-2">{zoneName}</p>
          <div className="mt-3 grid grid-cols-[1.2fr_1fr] gap-2">
            <label>
              <span className="sr-only">Date</span>
              <input type="date" className={field} value={date} min={bounds.min.slice(0, 10)} max={bounds.max.slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label>
              <span className="sr-only">Start time ({zoneName})</span>
              <select className={`${field} appearance-none`} value={time} onChange={(e) => setTime(e.target.value)}>
                {TIMES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Duration">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={duration === d}
                onClick={() => setDuration(d)}
                className={`h-10 rounded-full border px-3.5 text-[15px] font-medium ${duration === d ? "border-ink bg-ink text-white" : "border-line-strong bg-surface"}`}
              >
                {DURATION_LABEL[d]}
              </button>
            ))}
          </div>
          {(errors.when || timeError) && <p className="mt-1.5 text-[14px] text-danger">{errors.when ?? timeError}</p>}
        </section>

        <section>
          <h2 className="text-[18px] font-bold">How many</h2>
          <div className="mt-3 flex items-center gap-4">
            <div className="felt flex items-center rounded-[12px] p-1.5">
              <button type="button" onClick={() => setMin(Math.max(3, min - 1))} disabled={min <= 3} className="inline-flex size-11 items-center justify-center rounded-[8px] text-letter hover:bg-white/10 disabled:opacity-30" aria-label="Fewer people">
                <Icon name="minus" />
              </button>
              <output aria-live="polite" className="letter w-14 text-center text-[34px] leading-none">
                {min}
              </output>
              <button type="button" onClick={() => setMin(Math.min(12, min + 1))} disabled={min >= 12} className="inline-flex size-11 items-center justify-center rounded-[8px] text-letter hover:bg-white/10 disabled:opacity-30" aria-label="More people">
                <Icon name="plus" />
              </button>
            </div>
            <p className="text-[15px] leading-snug text-ink-2">It only happens if at least {min} people are in — including you.</p>
          </div>
          <button type="button" onClick={() => setMoreOpen(!moreOpen)} className="mt-3 inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold" aria-expanded={moreOpen}>
            More options <Icon name="chevronDown" size={16} className={moreOpen ? "rotate-180" : ""} />
          </button>
          {moreOpen && (
            <label className="mt-1 block">
              <span className="text-[15px] font-semibold">Max people</span>
              <select className={`${field} mt-1.5 appearance-none`} value={effectiveMax} onChange={(e) => setMax(Number(e.target.value))}>
                {Array.from({ length: 20 - min + 1 }, (_, i) => min + i).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}
        </section>

        <section className="space-y-4">
          <label className="block">
            <span className="text-[18px] font-bold">Title</span> <span className="text-[14px] text-ink-3">optional</span>
            <input className={`${field} mt-2`} maxLength={80} placeholder={generatedTitle || "We'll name it for you"} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-[18px] font-bold">Description</span> <span className="text-[14px] text-ink-3">optional</span>
            <textarea
              className="mt-2 block min-h-24 w-full rounded-[10px] border border-line-strong bg-surface px-3.5 py-3 text-[16px] focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              maxLength={280}
              placeholder="Bring your favorite game!"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <span className="mt-1 block text-right text-[13px] text-ink-3">{description.length}/280</span>
          </label>
        </section>

        <section className="space-y-4">
          <h2 className="text-[18px] font-bold">You</h2>
          <label className="block" data-field="name">
            <span className="text-[15px] font-semibold">First name</span>
            <input className={`${field} mt-1.5`} autoComplete="given-name" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
            {err("name")}
          </label>
          <label className="block" data-field="email">
            <span className="text-[15px] font-semibold">Email</span>
            <input className={`${field} mt-1.5`} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {errors.email ? err("email") : <span className="mt-1 block text-[14px] text-ink-2">We'll send you the link to your plan. No account needed.</span>}
          </label>
          <PhotoPicker name={name} onChange={setPhotoPath} />
          <label className="flex min-h-11 cursor-pointer items-center gap-3" data-field="is18">
            <input type="checkbox" className="size-5 accent-[#16171a]" checked={is18} onChange={(e) => setIs18(e.target.checked)} />
            <span className="text-[15px]">I'm 18 or older</span>
          </label>
          {err("is18")}
        </section>

        {admin && (
          <label className="flex min-h-11 items-center gap-3 rounded-[10px] border border-dashed border-line-strong bg-surface px-4">
            <input type="checkbox" className="size-5 accent-[#16171a]" checked={isDemo} onChange={(e) => setIsDemo(e.target.checked)} />
            <span className="text-[15px] font-semibold">Demo plan (team-created, shows the Demo badge, no limits)</span>
          </label>
        )}

        {venue && !somewhereElse && (
          <section className="rounded-[10px] border border-line bg-surface p-4" data-field="asVenue">
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="block text-[16px] font-bold">Post as {venue.name}</span>
                <span className="block text-[14px] text-ink-2">For people who run this place. Always free.</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={asVenue}
                onChange={(e) => setAsVenue(e.target.checked)}
                className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-line-strong transition-colors before:block before:size-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-ink checked:before:translate-x-[22px]"
              />
            </label>
            {asVenue && (
              <label className="mt-3 block">
                <span className="text-[15px] font-semibold">Work email</span>
                <input className={`${field} mt-1.5`} type="email" inputMode="email" value={venueEmail} onChange={(e) => setVenueEmail(e.target.value)} />
                <span className="mt-1 block text-[14px] text-ink-2">We'll email you a link to verify. Your plan goes live right away.</span>
              </label>
            )}
            {err("asVenue")}
          </section>
        )}

        {formError && (
          <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3.5 py-3 text-[15px] text-danger">
            {formError}
          </p>
        )}

        <div className="fixed inset-x-0 bottom-0 z-[900] border-t border-line bg-ground/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-sm sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <button
            type="submit"
            disabled={busy}
            className="mx-auto flex h-[52px] w-full max-w-2xl items-center justify-center rounded-full bg-bulb text-[18px] font-extrabold text-ink shadow-[0_1px_0_rgb(0_0_0/0.15),0_8px_20px_-8px_rgb(227_164_0/0.8)] hover:bg-[#ffd25c] active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Starting…" : "Start plan"}
          </button>
        </div>
      </form>

      {paywall && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="pw-title">
          <button type="button" aria-label="Close" onClick={() => setPaywall(false)} className="fade-in absolute inset-0 bg-ink/45" />
          <div className="sheet-in relative w-full max-w-md rounded-t-[20px] bg-surface px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:rounded-[16px] sm:pb-6">
            <h2 id="pw-title" className="text-[22px] font-bold">
              You've used your free plan this month
            </h2>
            <p className="mt-2 text-[16px] text-ink-2">Free includes 1 plan a month. Get iFound+ for unlimited plans — $8/month.</p>
            <div className="mt-5 flex flex-col gap-2">
              <Link href="/plus" className="flex h-[52px] items-center justify-center rounded-full bg-bulb text-[17px] font-bold text-ink">
                Get iFound+
              </Link>
              <button onClick={() => setPaywall(false)} className="h-12 rounded-full text-[16px] font-semibold text-ink-2">
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

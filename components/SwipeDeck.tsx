"use client";
// Swipe deck (TZ §8.12): right = I'm in, left = skip. Buttons and arrow keys do the same.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "framer-motion";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ACTIVITY_META } from "@/lib/activities";
import { formatCard, formatRelative, zoneAbbr } from "@/lib/tz";
import type { ApiError, DeckCard, DeckResponse, JoinResponse, MeProfile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { JoinSheet } from "./JoinSheet";
import { Bulbs, LetterLine } from "./Letterboard";
import { DemoChip } from "./StatusChip";
import { useNow } from "./useNow";

type Day = "today" | "tomorrow" | "week";
const DAYS: { v: Day; label: string }[] = [
  { v: "today", label: "Today" },
  { v: "tomorrow", label: "Tomorrow" },
  { v: "week", label: "This week" },
];

const skippedKey = (city: string) => `ifound_skipped_${city}`;
function readSkipped(city: string): string[] {
  try {
    const raw = localStorage.getItem(skippedKey(city));
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeSkipped(city: string, codes: string[]) {
  try {
    localStorage.setItem(skippedKey(city), JSON.stringify(codes.slice(-500)));
  } catch {
    /* private mode — skipping just won't persist */
  }
}

type Outcome = "remove" | "return";
interface CardHandle {
  swipe: (dir: "left" | "right") => void;
}

export function SwipeDeck({
  city,
  initial,
  initialProfile,
  first,
  serverNow,
}: {
  city: { slug: string; name: string; timezone: string };
  initial: DeckResponse;
  initialProfile: MeProfile | null;
  first: string | null;
  serverNow: string;
}) {
  const router = useRouter();
  const now = useNow(serverNow);
  const [day, setDay] = useState<Day>("week");
  const [cards, setCards] = useState<DeckCard[]>(initial.cards);
  const [cursor, setCursor] = useState<number | null>(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [skippedReady, setSkippedReady] = useState(false);
  const [profile, setProfile] = useState<MeProfile | null>(initialProfile);
  const [sheet, setSheet] = useState<{ card: DeckCard; resolve: (o: Outcome) => void } | null>(null);
  const [toast, setToast] = useState<{ text: string; undoCode?: string } | null>(null);
  const [celebrate, setCelebrate] = useState<DeckCard | null>(null);
  const topRef = useRef<CardHandle>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const shortCity = city.name.split(",")[0];

  // Filter out previously skipped plans once we can read localStorage (client only).
  useEffect(() => {
    const skipped = new Set(readSkipped(city.slug));
    setCards((cs) => cs.filter((c) => !skipped.has(c.code) || c.code === first));
    setSkippedReady(true);
  }, [city.slug, first]);

  const load = useCallback(
    async (d: Day, from: number, replace: boolean) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ city: city.slug, day: d, cursor: String(from) });
        if (first) qs.set("first", first);
        const r = await fetch(`/api/deck?${qs}`, { cache: "no-store" });
        const body = (await r.json()) as DeckResponse;
        const skipped = new Set(readSkipped(city.slug));
        const fresh = body.cards.filter((c) => !skipped.has(c.code) || c.code === first);
        setCards((cs) => {
          const base = replace ? [] : cs;
          const seen = new Set(base.map((c) => c.code));
          return [...base, ...fresh.filter((c) => !seen.has(c.code))];
        });
        setCursor(body.nextCursor);
      } catch {
        setToast({ text: "Couldn't load plans — check your connection" });
      } finally {
        setLoading(false);
      }
    },
    [city.slug, first],
  );

  // Load the next batch when two cards are left.
  useEffect(() => {
    if (skippedReady && cards.length <= 2 && cursor !== null && !loading) void load(day, cursor, false);
  }, [cards.length, cursor, loading, load, day, skippedReady]);

  function changeDay(d: Day) {
    setDay(d);
    setCards([]);
    void load(d, 0, true);
  }

  const removeTop = (code: string) => setCards((cs) => cs.filter((c) => c.code !== code));

  async function join(card: DeckCard, body: object): Promise<Outcome> {
    let res: Response;
    try {
      res = await fetch(`/api/events/${card.code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setToast({ text: "Couldn't join — try again" });
      return "return";
    }
    const out = (await res.json().catch(() => null)) as JoinResponse | ApiError | null;
    if (res.ok && out && "result" in out) {
      if (out.justConfirmed) {
        setCelebrate({ ...card, count: out.count, status: "confirmed" });
        setToast(null);
      } else {
        setToast({ text: out.status === "confirmed" ? "You're in — it's on!" : "You're in", undoCode: card.code });
      }
      return "remove";
    }
    const err = out && "error" in out ? out.error : "server_error";
    if (err === "profile_required") {
      setProfile(null);
      return openSheet(card);
    }
    if (err === "already_joined") return "remove";
    if (err === "full") {
      setToast({ text: "This one just filled up" });
      return "remove";
    }
    if (err === "closed" || err === "not_found") {
      setToast({ text: "Joining closed" });
      return "remove";
    }
    if (err === "rate_limited") {
      setToast({ text: "Slow down a bit" });
      return "return";
    }
    setToast({ text: (out as ApiError | null)?.message ?? "Couldn't join — try again" });
    return "return";
  }

  function openSheet(card: DeckCard): Promise<Outcome> {
    return new Promise((resolve) => setSheet({ card, resolve }));
  }

  async function decide(card: DeckCard, dir: "left" | "right"): Promise<Outcome> {
    if (dir === "left") {
      writeSkipped(city.slug, [...readSkipped(city.slug).filter((c) => c !== card.code), card.code]);
      return "remove";
    }
    if (!profile) return openSheet(card);
    return join(card, { useSavedProfile: true });
  }

  async function undo(code: string) {
    setToast(null);
    const r = await fetch(`/api/events/${code}/leave`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    if (r?.ok) {
      setToast({ text: "Undone — you're out" });
      void load(day, 0, true);
    } else setToast({ text: "Couldn't undo — leave from the plan page" });
  }

  // Keyboard: ← skip, → I'm in, Enter details.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet || celebrate) return;
      if (!sectionRef.current?.offsetParent) return; // deck is hidden (e.g. desktop list view)
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === "ArrowLeft") topRef.current?.swipe("left");
      else if (e.key === "ArrowRight") topRef.current?.swipe("right");
      else if (e.key === "Enter" && cards[0]) router.push(`/e/${cards[0].code}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet, celebrate, cards, router]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.undoCode ? 5000 : 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const visible = cards.slice(0, 3);
  const empty = skippedReady && !loading && cards.length === 0;

  return (
    <section ref={sectionRef} aria-label={`Swipe plans in ${shortCity}`} className="mx-auto w-full max-w-[420px]">
      <div role="radiogroup" aria-label="Day" className="flex gap-2">
        {DAYS.map((d) => (
          <button
            key={d.v}
            role="radio"
            aria-checked={day === d.v}
            onClick={() => changeDay(d.v)}
            className={`inline-flex h-10 items-center rounded-full border px-3.5 text-[15px] font-medium ${
              day === d.v ? "border-ink bg-ink text-white" : "border-line-strong bg-surface"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="relative mt-4 h-[min(64dvh,540px)] min-h-[420px]">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center rounded-[16px] border border-dashed border-line-strong bg-surface px-6 text-center">
            <p className="text-[20px] font-bold">That's everything in {shortCity} this week.</p>
            <p className="mt-1 text-[15px] text-ink-2">Nothing to join? Start one — it only happens if people join.</p>
            <Link href={`/new?city=${city.slug}`} className="mt-5 inline-flex h-12 items-center rounded-full bg-bulb px-6 text-[16px] font-bold text-ink">
              Start a plan
            </Link>
            <button
              onClick={() => {
                writeSkipped(city.slug, []);
                void load(day, 0, true);
              }}
              className="mt-2 inline-flex min-h-11 items-center text-[15px] font-semibold underline"
            >
              Show skipped
            </button>
          </div>
        ) : cards.length === 0 ? (
          <div className="felt flex h-full items-center justify-center rounded-[16px]" aria-label="Loading plans">
            <LetterLine text="Loading…" className="text-[28px]" />
          </div>
        ) : (
          visible
            .map((c, i) => (
              <SwipeCard
                key={c.code}
                ref={i === 0 ? topRef : undefined}
                card={c}
                depth={i}
                now={now}
                onDecide={async (dir) => {
                  const o = await decide(c, dir);
                  if (o === "remove") {
                    await new Promise((r) => setTimeout(r, 220)); // let the fly-out finish
                    removeTop(c.code);
                  }
                  return o;
                }}
                onOpen={() => router.push(`/e/${c.code}`)}
              />
            ))
            .reverse()
        )}
      </div>

      {!empty && cards.length > 0 && (
        <div className="mt-5 flex items-center justify-center gap-5">
          <button
            onClick={() => topRef.current?.swipe("left")}
            aria-label="Skip"
            className="flex size-16 flex-col items-center justify-center rounded-full border border-line-strong bg-surface text-ink-2 shadow-[var(--shadow-lift)] active:scale-95"
          >
            <Icon name="close" size={26} />
            <span className="sr-only">Skip</span>
          </button>
          <span className="text-[13px] text-ink-3">← Skip · I'm in →</span>
          <button
            onClick={() => topRef.current?.swipe("right")}
            aria-label="I'm in"
            className="flex size-16 items-center justify-center rounded-full bg-bulb text-ink shadow-[0_1px_0_rgb(0_0_0/0.15),0_8px_20px_-8px_rgb(227_164_0/0.8)] active:scale-95"
          >
            <Icon name="check" size={28} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {profile && (
        <p className="mt-4 text-center text-[14px] text-ink-2">
          Joining as <span className="font-semibold text-ink">{profile.name}</span> ·{" "}
          <button
            className="font-semibold underline"
            onClick={async () => {
              await fetch("/api/me/profile", { method: "DELETE" }).catch(() => null);
              setProfile(null);
            }}
          >
            Not you? Clear
          </button>
        </p>
      )}

      {toast && (
        <div
          role="status"
          className="fade-in fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-[950] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-[12px] bg-ink px-4 py-3 text-[15px] font-medium text-white shadow-[var(--shadow-lift)]"
        >
          <span>{toast.text}</span>
          {toast.undoCode && (
            <button onClick={() => undo(toast.undoCode!)} className="min-h-9 rounded-full px-3 font-bold text-bulb">
              Undo
            </button>
          )}
        </div>
      )}

      {sheet && (
        <JoinSheet
          code={sheet.card.code}
          title={sheet.card.title}
          profile={null}
          onClose={() => {
            sheet.resolve("return");
            setSheet(null);
          }}
          onJoined={(r, saved) => {
            setProfile(saved);
            if (r.justConfirmed) setCelebrate({ ...sheet.card, count: r.count, status: "confirmed" });
            else setToast({ text: r.status === "confirmed" ? "You're in — it's on!" : "You're in", undoCode: sheet.card.code });
            sheet.resolve("remove");
            setSheet(null);
          }}
        />
      )}

      {celebrate && <Celebration card={celebrate} onClose={() => setCelebrate(null)} />}
    </section>
  );
}

const SwipeCard = forwardRef<
  CardHandle,
  { card: DeckCard; depth: number; now: string; onDecide: (dir: "left" | "right") => Promise<Outcome>; onOpen: () => void }
>(function SwipeCard({ card, depth, now, onDecide, onOpen }, ref) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], reduce ? [0, 0, 0] : [-14, 0, 14]);
  const inOpacity = useTransform(x, [20, 120], [0, 1]);
  const skipOpacity = useTransform(x, [-120, -20], [1, 0]);
  const busy = useRef(false);
  const el = useRef<HTMLDivElement>(null);

  const go = useCallback(
    async (dir: "left" | "right") => {
      if (busy.current) return;
      busy.current = true;
      const w = el.current?.offsetWidth ?? 360;
      // Fly immediately; the card is only really removed once the server answers.
      if (reduce) x.set(0);
      else void animate(x, (dir === "right" ? 1 : -1) * w * 1.4, { duration: 0.32, ease: [0.16, 1, 0.3, 1] });
      const outcome = await onDecide(dir);
      if (outcome === "return") {
        void animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
        busy.current = false;
      }
    },
    [onDecide, reduce, x],
  );

  useImperativeHandle(ref, () => ({ swipe: go }), [go]);

  function onDragEnd(_: unknown, info: PanInfo) {
    const w = el.current?.offsetWidth ?? 360;
    if (info.offset.x > w * 0.3 || info.velocity.x > 600) void go("right");
    else if (info.offset.x < -w * 0.3 || info.velocity.x < -600) void go("left");
    else void animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
  }

  const top = depth === 0;
  const needed = Math.max(card.minPeople - card.count, 0);
  const on = card.status === "confirmed";
  const pct = Math.min(100, Math.round((card.count / (on ? card.maxPeople : card.minPeople)) * 100));

  return (
    <motion.div
      ref={el}
      className="absolute inset-0 select-none"
      style={{
        x: top ? x : 0,
        rotate: top ? rotate : 0,
        scale: 1 - depth * 0.04,
        y: depth * 14,
        zIndex: 10 - depth,
        touchAction: "pan-y",
      }}
      drag={top ? "x" : false}
      dragSnapToOrigin={false}
      dragElastic={0.9}
      onDragEnd={top ? onDragEnd : undefined}
      onTap={top ? onOpen : undefined}
      aria-hidden={!top}
    >
      <article className="flex h-full flex-col overflow-hidden rounded-[16px] border border-line bg-surface shadow-[0_2px_4px_rgb(22_23_26/0.06),0_18px_40px_-16px_rgb(22_23_26/0.35)]">
        <div className="felt relative px-5 pt-3 pb-4 [container-type:inline-size]">
          <Bulbs lit={on} count={12} />
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <LetterLine text={on ? "It's on" : `${card.count} of ${card.minPeople}`} style={{ fontSize: "min(3.6rem, 16cqw)" }} />
              <LetterLine
                text={on ? `${card.count} going` : `needs ${needed} more`}
                className={`mt-1 text-[clamp(1rem,6cqw,1.4rem)] ${on ? "[&_.letter]:text-go-bright" : "[&_.letter]:text-bulb"}`}
              />
            </div>
            <span className="text-[54px] leading-none" aria-hidden="true">
              {ACTIVITY_META[card.activity].emoji}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
            <div className={`h-full rounded-full ${on ? "bg-go-bright" : "bg-bulb"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
          <div className="flex flex-wrap gap-1.5">
            {needed === 1 && !on && (
              <span className="inline-flex h-7 items-center rounded-full bg-bulb px-3 text-[13px] font-bold text-ink">1 away from happening!</span>
            )}
            {on && <span className="inline-flex h-7 items-center rounded-full bg-go px-3 text-[13px] font-bold text-white">It's on</span>}
            {card.hostVenueName && (
              <span className="inline-flex h-7 items-center rounded-full border border-line-strong px-3 text-[13px] font-semibold">
                Hosted by {card.hostVenueName} ✓
              </span>
            )}
            {card.isDemo && <DemoChip />}
          </div>
          <h2 className="mt-3 text-[24px] leading-[1.15] font-extrabold tracking-[-0.01em]">{card.title}</h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-[16px] text-ink-2">
            <Icon name="pin" size={17} /> {card.place.name}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[16px]">
            <Icon name="clock" size={17} className="text-ink-2" />
            <span className="font-semibold">
              {formatCard(card.startsAt, card.timezone)} {zoneAbbr(card.timezone)}
            </span>
            <span className="text-ink-2">· {formatRelative(card.startsAt, now)}</span>
          </p>
          <div className="mt-auto flex items-center gap-2.5 pt-4">
            {card.host ? (
              <>
                <Avatar name={card.host.name} photoUrl={card.host.photoUrl} size={34} />
                <span className="text-[15px] text-ink-2">
                  Hosted by <span className="font-semibold text-ink">{card.host.name}</span>
                </span>
              </>
            ) : (
              <span className="text-[15px] text-ink-2">Hosted by {card.hostVenueName ?? card.place.name}</span>
            )}
            <span className="ml-auto text-[13px] text-ink-3">Tap for details</span>
          </div>
        </div>
      </article>

      {top && (
        <>
          <motion.span
            style={{ opacity: inOpacity }}
            className="pointer-events-none absolute top-6 left-5 rotate-[-10deg] rounded-[8px] border-[3px] border-go-bright px-3 py-1 text-[34px] font-black tracking-wider text-go-bright"
            aria-hidden="true"
          >
            IN
          </motion.span>
          <motion.span
            style={{ opacity: skipOpacity }}
            className="pointer-events-none absolute top-6 right-5 rotate-[10deg] rounded-[8px] border-[3px] border-[#c9cbc5] px-3 py-1 text-[34px] font-black tracking-wider text-[#c9cbc5]"
            aria-hidden="true"
          >
            SKIP
          </motion.span>
        </>
      )}
    </motion.div>
  );
});

function Celebration({ card, onClose }: { card: DeckCard; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fade-in fixed inset-0 z-[3000] flex flex-col bg-felt" role="dialog" aria-modal="true" aria-label="It's on">
      <div className="felt flex flex-1 flex-col justify-center px-6 [container-type:inline-size]">
        <Bulbs lit="chase" count={14} />
        <div className="py-8">
          <LetterLine text="It's on!" animate style={{ fontSize: "min(7rem, 26cqw)" }} />
          <LetterLine text={`${card.count} going`} animate delayOffset={400} className="mt-2 text-[clamp(1.4rem,9cqw,2.6rem)] [&_.letter]:text-go-bright" />
        </div>
        <Bulbs lit="chase" count={14} />
        <p className="mt-8 text-[24px] leading-tight font-extrabold text-white">You made it happen — it's on!</p>
        <p className="mt-2 text-[16px] text-white/80">
          {card.title}. Everyone's getting the “It's on” email with a calendar invite.
        </p>
      </div>
      <div className="flex flex-col gap-2 bg-felt px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <Link href={`/e/${card.code}`} className="flex h-[52px] items-center justify-center rounded-full bg-bulb text-[17px] font-bold text-ink">
          See the plan
        </Link>
        <button onClick={onClose} className="h-12 rounded-full text-[16px] font-semibold text-white/85">
          Keep swiping
        </button>
      </div>
    </div>
  );
}

import Link from "next/link";
import { listCities, listEvents } from "@/lib/events";
import { nowUtc } from "@/lib/tz";
import { EventCard } from "@/components/EventCard";
import { Footer, Header } from "@/components/Header";
import { HomeMap } from "@/components/HomeMap";
import { CityBoards } from "@/components/CityBoards";
import { LetterLine } from "@/components/Letterboard";
import { WaitlistForm } from "@/components/WaitlistForm";
import { DemoStartButton } from "@/components/DemoControls";
import { TrackView } from "@/components/TrackView";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cities = await listCities();
  const austin = cities.find((c) => c.slug === "austin");
  const soon = austin ? (await listEvents("austin", austin.timezone, "all", [])).slice(0, 6) : [];
  const now = nowUtc();

  return (
    <>
      <Header />
      <TrackView name="landing_view" />
      <main>
        <section className="mx-auto max-w-6xl px-4 pt-8 pb-10 sm:pt-14">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h1 className="text-[clamp(2.3rem,8.5vw,4.25rem)] leading-[1.02] font-extrabold tracking-[-0.03em]">
                Plans that only happen when enough people are in.
              </h1>
              <p className="mt-5 max-w-[34rem] text-[18px] leading-relaxed text-ink-2">
                New in town? Pick a plan near you and tap I'm in. If enough people join, it's on. If not, it's quietly called off — you
                never walk into an empty room.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Link href="/c/austin/swipe" className="inline-flex h-[52px] items-center rounded-full bg-bulb px-6 text-[17px] font-extrabold text-ink shadow-[0_1px_0_rgb(0_0_0/0.15),0_8px_20px_-8px_rgb(227_164_0/0.8)] hover:bg-[#ffd25c]">
                  Swipe plans in Austin
                </Link>
                <Link href="/new" className="inline-flex h-[52px] items-center rounded-full border border-line-strong bg-surface px-6 text-[17px] font-bold">
                  Start a plan
                </Link>
              </div>
            </div>
            {/* The mechanic, shown on the board itself */}
            <div className="felt rounded-[14px] px-6 py-6 [container-type:inline-size]" aria-label="Example: 4 of 6 are in, needs 2 more. At 6, it's on.">
              <LetterLine text="4 of 6" style={{ fontSize: "min(5.5rem, 24cqw)" }} />
              <LetterLine text="are in" className="mt-1 text-[clamp(1.4rem,9cqw,2.4rem)]" />
              <LetterLine text="needs 2 more" className="mt-1 text-[clamp(1rem,6cqw,1.5rem)] [&_.letter]:text-bulb" />
              <div className="mt-5 border-t border-white/15 pt-4">
                <LetterLine text="at 6 → it's on" className="text-[clamp(1rem,6cqw,1.5rem)] [&_.letter]:text-go-bright" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mb-12 max-w-6xl px-4" aria-labelledby="jury">
          <div className="rounded-[14px] border-2 border-dashed border-bulb-deep bg-[#fff8e3] p-5 sm:p-7">
            <h2 id="jury" className="text-[22px] font-extrabold">Trying iFound? Here's the 60-second path</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[16px] leading-relaxed">
              <li>
                Start a <span className="font-semibold">demo plan</span> — board games in Austin that needs 3 people.
              </li>
              <li>
                Tap <span className="font-semibold">I'm in</span> with your first name and email. No account.
              </li>
              <li>
                Add labeled demo guests until it reaches 3 and watch it flip to <span className="font-semibold">It's on!</span>, then{" "}
                <span className="font-semibold">See the email everyone got</span>.
              </li>
              <li>
                Skip to the day before (reminder email), then to after the plan, and tap{" "}
                <span className="font-semibold">Run it again next week</span> — the weekly crew is what iFound+ is for.
              </li>
              <li>
                Swipe real plans in{" "}
                <a href="/c/austin/swipe" className="font-semibold underline">
                  Austin
                </a>
                , start your own, and try{" "}
                <a href="/plus" className="font-semibold underline">
                  iFound+
                </a>{" "}
                with test card 4242 4242 4242 4242.
              </li>
            </ol>
            <DemoStartButton className="mt-5" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4" aria-labelledby="cities">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="cities" className="text-[28px] leading-none font-extrabold tracking-[-0.02em]">
              Pick your city
            </h2>
            <p className="text-[15px] text-ink-2">Five US cities to start. Times are always local to the plan.</p>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="relative hidden h-full min-h-[460px] overflow-hidden rounded-[14px] border border-line bg-[#e8e8e3] shadow-[var(--shadow-lift)] lg:block">
              <HomeMap cities={cities} />
            </div>
            <CityBoards cities={cities} serverNow={now} />
          </div>
        </section>

        {soon.length > 0 && (
          <section className="mx-auto mt-12 max-w-6xl px-4" aria-labelledby="soon">
            <div className="flex items-end justify-between gap-3">
              <h2 id="soon" className="text-[22px] font-bold">
                Happening in Austin
              </h2>
              <Link href="/c/austin" className="text-[15px] font-semibold underline">
                See all
              </Link>
            </div>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {soon.map((e) => (
                <li key={e.code}>
                  <EventCard e={e} timezone={austin!.timezone} now={now} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mx-auto mt-14 max-w-6xl px-4" aria-labelledby="how">
          <h2 id="how" className="text-[22px] font-bold">
            How it works
          </h2>
          <ol className="mt-4 grid gap-6 sm:grid-cols-3">
            {[
              ["Pick a plan", "Board games at a cafe, a run by the lake, pickup soccer. Real places, real times."],
              ["Tap I'm in", "First name and email. No account, no password."],
              ["It's on when it fills", "When enough people are in, everyone gets “It's on”. If not, it's called off 2 hours before."],
            ].map(([t, d]) => (
              <li key={t} className="border-t-2 border-ink pt-3">
                <h3 className="text-[18px] font-bold">{t}</h3>
                <p className="mt-1 text-[16px] leading-relaxed text-ink-2">{d}</p>
              </li>
            ))}
          </ol>
          <Link href="/new" className="mt-7 inline-flex h-[52px] items-center rounded-full bg-ink px-6 text-[17px] font-bold text-white">
            Start a plan
          </Link>
        </section>

        <section className="mx-auto mt-14 max-w-6xl px-4" aria-labelledby="moved">
          <div className="felt grid gap-5 rounded-[14px] p-6 sm:grid-cols-[1fr_auto] sm:items-end sm:p-8">
            <div>
              <h2 id="moved" className="text-[28px] leading-tight font-extrabold text-letter">
                Just moved?
              </h2>
              <p className="mt-2 max-w-[44rem] text-[17px] leading-relaxed" style={{ color: "rgb(245 243 236 / 0.78)" }}>
                Moving to a new city usually means starting your social life from zero. iFound plans are small (3–12 people), in public places, and only
                happen when enough people commit — the easiest way to find your first crew.
              </p>
            </div>
            <Link href="/c/austin/swipe" className="inline-flex h-[52px] items-center justify-center rounded-full bg-bulb px-6 text-[17px] font-bold text-ink">
              Find a plan in Austin
            </Link>
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-6xl px-4" aria-labelledby="wl">
          <div className="rounded-[10px] border border-line bg-surface p-5 sm:p-7">
            <h2 id="wl" className="text-[20px] font-bold">
              Moving soon? Tell us where — we'll open your city next.
            </h2>
            <WaitlistForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

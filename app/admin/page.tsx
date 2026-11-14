import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/http";
import { formatShort } from "@/lib/tz";
import { AdminButton } from "@/components/AdminButton";
import { funnel } from "@/lib/analytics";
import { Footer, Header } from "@/components/Header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

async function count(table: string, f?: (q: any) => any): Promise<number> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let q = db().from(table).select("*", { count: "exact", head: true });
  if (f) q = f(q);
  const { count: n } = await q;
  return n ?? 0;
}

type EventRow = {
  id: string; code: string; title: string; starts_at: string; status: string; participant_count: number; min_people: number;
  hidden: boolean; is_demo: boolean; city: { timezone: string } | null;
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ key?: string; q?: string }> }) {
  const sp = await searchParams;
  if (sp.key) redirect(`/admin/login?key=${encodeURIComponent(sp.key)}`);
  if (!(await isAdmin())) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-md px-4 pt-12">
          <h1 className="text-[26px] font-extrabold">Admins only</h1>
          <p className="mt-2 text-[16px] text-ink-2">Open /admin?key=… with the admin key.</p>
        </main>
        <Footer />
      </>
    );
  }

  const [plans, joins, confirmed, completed, subs, waitlist, reports, events] = await Promise.all([
    count("events", (q) => q.eq("is_demo", false)),
    count("participants", (q) => q.eq("is_host", false)),
    count("events", (q) => q.not("confirmed_at", "is", null)),
    count("events", (q) => q.in("status", ["confirmed", "completed"])),
    count("subscriptions", (q) => q.in("status", ["active", "trialing"])),
    db().from("waitlist").select("city"),
    db()
      .from("reports")
      .select("id, reason, details, created_at, participant_id, event:events(id, code, title, hidden), participant:participants(id, display_name, photo_hidden)")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    (() => {
      let q = db()
        .from("events")
        .select("id, code, title, starts_at, status, participant_count, min_people, hidden, is_demo, city:cities!events_city_slug_fkey(timezone)")
        .order("created_at", { ascending: false })
        .limit(40);
      if (sp.q) q = q.or(`title.ilike.%${sp.q.replace(/[%,()]/g, "")}%,code.eq.${sp.q.replace(/[^a-z0-9]/gi, "")}`);
      return q;
    })(),
  ]);

  const allPlans = await count("events");
  const f = await funnel();
  const FUNNELS: [string, [string, string][]][] = [
    ["Join", [["event_view", "Plan viewed"], ["join_click", "Tapped I'm in"], ["join_success", "Joined"], ["event_confirmed", "Plan confirmed"]]],
    ["Swipe", [["swipe_view", "Deck opened"], ["swipe_right", "Swiped right"], ["swipe_left", "Swiped left"], ["swipe_undo", "Undo"], ["deck_end", "Reached the end"]]],
    ["Create & pay", [["create_start", "Opened Start a plan"], ["create_success", "Plan created"], ["paywall_shown", "Hit the paywall"], ["checkout_start", "Opened checkout"], ["checkout_success", "Paid (test)"], ["repeat_created", "Ran a plan again"]]],
  ];
  const byCity = new Map<string, number>();
  for (const w of waitlist.data ?? []) byCity.set(w.city.toLowerCase(), (byCity.get(w.city.toLowerCase()) ?? 0) + 1);
  const stats: [string, string | number][] = [
    ["Plans (non-demo)", plans],
    ["All plans", allPlans],
    ["Joins", joins],
    ["Ever confirmed", confirmed],
    ["Confirmed share", allPlans ? `${Math.round((completed / allPlans) * 100)}%` : "—"],
    ["Active iFound+", subs],
    ["Waitlist", waitlist.data?.length ?? 0],
  ];
  type Report = {
    id: string; reason: string; details: string | null; participant_id: string | null;
    event: { id: string; code: string; title: string; hidden: boolean } | null;
    participant: { id: string; display_name: string; photo_hidden: boolean } | null;
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pt-6 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em]">Admin</h1>
          <Link href="/new?demo=1" className="inline-flex h-11 items-center rounded-full bg-bulb px-5 text-[15px] font-bold text-ink">
            Create demo plan
          </Link>
        </div>

        <section aria-labelledby="stats" className="mt-6">
          <h2 id="stats" className="text-[18px] font-bold">Stats</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([k, v]) => (
              <div key={k} className="rounded-[10px] border border-line bg-surface p-3">
                <dt className="text-[13px] text-ink-2">{k}</dt>
                <dd className="text-[24px] font-extrabold">{v}</dd>
              </div>
            ))}
          </dl>
          {byCity.size > 0 && (
            <p className="mt-3 text-[14px] text-ink-2">
              Waitlist by city: {[...byCity.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(" · ")}
            </p>
          )}
        </section>

        <section aria-labelledby="funnel" className="mt-10">
          <h2 id="funnel" className="text-[18px] font-bold">Funnel (real events, demo plans excluded)</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            {FUNNELS.map(([title, steps]) => (
              <table key={title} className="w-full border-collapse rounded-[10px] bg-surface text-left text-[14px]">
                <caption className="pb-2 text-left text-[15px] font-semibold">{title}</caption>
                <thead>
                  <tr className="border-b border-line-strong text-ink-2">
                    <th className="py-2 pl-3 font-medium">Step</th>
                    <th className="py-2 font-medium">Events</th>
                    <th className="py-2 font-medium">People</th>
                    <th className="py-2 pr-3 font-medium">vs first</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map(([key, label]) => {
                    const row = f.get(key);
                    const base = f.get(steps[0][0])?.people ?? 0;
                    return (
                      <tr key={key} className="border-b border-line">
                        <td className="py-2 pl-3">{label}</td>
                        <td className="py-2 tabular-nums">{row?.total ?? 0}</td>
                        <td className="py-2 tabular-nums">{row?.people ?? 0}</td>
                        <td className="py-2 pr-3 tabular-nums">{base ? `${Math.round(((row?.people ?? 0) / base) * 100)}%` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ))}
          </div>
        </section>

        <section aria-labelledby="reports" className="mt-10">
          <h2 id="reports" className="text-[18px] font-bold">Reports ({reports.data?.length ?? 0} open)</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {((reports.data ?? []) as unknown as Report[]).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1 text-[15px]">
                  <span className="font-semibold">{r.reason}</span>
                  {r.participant ? ` · photo of ${r.participant.display_name}` : ""} ·{" "}
                  {r.event && (
                    <Link href={`/e/${r.event.code}`} className="underline">
                      {r.event.title}
                    </Link>
                  )}
                  {r.details && <span className="block text-[14px] text-ink-2">{r.details}</span>}
                </div>
                {r.participant ? (
                  <AdminButton action="hide_photo" id={r.participant.id} label="Hide photo" tone="danger" />
                ) : (
                  r.event && <AdminButton action="hide_event" id={r.event.id} label="Hide plan" tone="danger" />
                )}
                <AdminButton action="resolve_report" id={r.id} label="Dismiss" />
              </li>
            ))}
            {!reports.data?.length && <li className="py-4 text-[15px] text-ink-2">No open reports.</li>}
          </ul>
        </section>

        <section aria-labelledby="plans" className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="plans" className="text-[18px] font-bold">Plans</h2>
            <form className="flex gap-2">
              <input name="q" defaultValue={sp.q ?? ""} placeholder="Title or code" className="h-10 rounded-full border border-line-strong bg-surface px-4 text-[16px]" />
              <button className="h-10 rounded-full bg-ink px-4 text-[14px] font-semibold text-white">Search</button>
            </form>
          </div>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {((events.data ?? []) as unknown as EventRow[]).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/e/${e.code}`} className="text-[15px] font-semibold underline">
                    {e.title}
                  </Link>
                  <span className="block text-[13px] text-ink-2">
                    {e.code} · {formatShort(e.starts_at, e.city?.timezone ?? "America/Chicago")} · {e.status} · {e.participant_count}/{e.min_people}
                    {e.hidden ? " · HIDDEN" : ""}
                    {e.is_demo ? " · demo" : ""}
                  </span>
                </div>
                <AdminButton action={e.hidden ? "unhide_event" : "hide_event"} id={e.id} label={e.hidden ? "Unhide" : "Hide"} />
                <AdminButton action={e.is_demo ? "demo_off" : "demo_on"} id={e.id} label={e.is_demo ? "Unmark demo" : "Mark demo"} />
                {(e.status === "filling" || e.status === "confirmed") && <AdminButton action="cancel_event" id={e.id} label="Cancel" tone="danger" />}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}

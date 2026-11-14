import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Footer, Header } from "@/components/Header";
import { StatusChip } from "@/components/StatusChip";
import { VenueCancelButton, VenueConfirmButton } from "@/components/VenueActions";
import { effectiveStatus } from "@/lib/status";
import { formatShort, nowUtc } from "@/lib/tz";
import type { CancelReason, EventStatus } from "@/lib/types";
import { claimFromToken, siblingClaimIds } from "@/lib/venue";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage your venue's plans", robots: { index: false } };

type Row = {
  code: string; title: string; starts_at: string; duration_minutes: number; status: EventStatus; cancel_reason: CancelReason | null;
  participant_count: number; min_people: number; max_people: number; city: { timezone: string } | null;
};

// Venue view: counts only — never names, photos or emails of participants (TZ §7).
export default async function ManagePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ verified?: string }> }) {
  const token = decodeURIComponent((await params).token);
  const justVerified = (await searchParams).verified === "1";
  const claim = await claimFromToken(token);
  if (!claim) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-md px-4 pt-12">
          <h1 className="text-[26px] font-extrabold">This link has expired</h1>
          <p className="mt-2 text-[16px] text-ink-2">Post a plan as your venue again and we'll send a fresh link.</p>
        </main>
        <Footer />
      </>
    );
  }
  const ids = await siblingClaimIds(claim);
  const { data } = await db()
    .from("events")
    .select("code, title, starts_at, duration_minutes, status, cancel_reason, participant_count, min_people, max_people, city:cities!events_city_slug_fkey(timezone)")
    .in("venue_claim_id", ids)
    .order("starts_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];
  const now = nowUtc();
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-16">
        {justVerified && <p className="mb-5 rounded-[10px] bg-go px-4 py-3 text-[16px] font-semibold text-white">Confirmed ✓ Your plans now show the venue badge.</p>}
        <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.02em]">{claim.venue.name}</h1>
        <p className="mt-1 text-[15px] text-ink-2">Your plans on iFound. You see how many people joined, never who.</p>
        {!claim.verifiedAt ? (
          <div className="mt-6 rounded-[10px] border border-line bg-surface p-5">
            <p className="text-[16px] font-semibold">Confirm you represent {claim.venue.name} to manage plans and get the ✓ badge.</p>
            <VenueConfirmButton token={token} />
          </div>
        ) : (
          <>
            <Link
              href={`/new?venue=${claim.venue.id}&asVenue=1`}
              className="mt-5 inline-flex h-12 items-center rounded-full bg-bulb px-5 text-[16px] font-bold text-ink"
            >
              Start a plan as {claim.venue.name}
            </Link>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {rows.length === 0 && <li className="py-6 text-[15px] text-ink-2">No plans yet.</li>}
              {rows.map((r) => {
                const eff = effectiveStatus({ status: r.status, cancelReason: r.cancel_reason, startsAt: r.starts_at, durationMinutes: r.duration_minutes }, now);
                const open = eff.status === "filling" || eff.status === "confirmed";
                return (
                  <li key={r.code} className="flex flex-wrap items-center gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <Link href={`/e/${r.code}`} className="text-[16px] font-semibold underline">{r.title}</Link>
                      <p className="text-[14px] text-ink-2">
                        {formatShort(r.starts_at, r.city?.timezone ?? "America/Chicago")} · {r.participant_count} of {r.min_people} needed · max {r.max_people}
                      </p>
                    </div>
                    <StatusChip status={eff.status} isFull={r.participant_count >= r.max_people} />
                    {open && <VenueCancelButton token={token} code={r.code} />}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

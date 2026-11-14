import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventDetail, getEventRow } from "@/lib/events";
import { userToken } from "@/lib/http";
import { nowUtc, formatShort } from "@/lib/tz";
import { EventView } from "@/components/EventView";
import { Footer, Header } from "@/components/Header";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const row = await getEventRow(code);
  if (!row || row.hidden) return { title: "Plan not found" };
  const tz = row.city?.timezone ?? "America/Chicago";
  const where = row.venue?.name ?? row.place_name ?? "";
  return {
    title: row.title,
    description: `${formatShort(row.starts_at, tz)} at ${where}. It only happens if ${row.min_people} people are in — ${row.participant_count} so far.`,
  };
}

export default async function EventPage({ params, searchParams }: Props) {
  const { code } = await params;
  const sp = await searchParams;
  const event = await getEventDetail(code, await userToken());
  if (!event) notFound();
  return (
    <>
      <Header city={event.citySlug} />
      <EventView initial={event} serverNow={nowUtc()} justCreated={sp.new === "1"} />
      <Footer />
    </>
  );
}

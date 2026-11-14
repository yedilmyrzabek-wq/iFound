import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCity, listEvents, listVenues } from "@/lib/events";
import { nowUtc } from "@/lib/tz";
import { CityView } from "@/components/CityView";
import { Footer, Header } from "@/components/Header";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await getCity((await params).city);
  return { title: city ? `Plans in ${city.name}` : "City not found" };
}

export default async function CityPage({ params }: Props) {
  const city = await getCity((await params).city);
  if (!city) notFound();
  const [venues, events] = await Promise.all([listVenues(city.slug), listEvents(city.slug, city.timezone, "all", [])]);
  return (
    <>
      <Header city={city.slug} />
      <CityView city={city} venues={venues} initial={events} serverNow={nowUtc()} />
      <Footer />
    </>
  );
}

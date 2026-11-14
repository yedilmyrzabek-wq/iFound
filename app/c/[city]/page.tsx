import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCity, getDeck, listEvents, listVenues } from "@/lib/events";
import { userToken } from "@/lib/http";
import { getProfile } from "@/lib/profile";
import { previewMode } from "@/lib/preview";
import { nowUtc } from "@/lib/tz";
import { CityView } from "@/components/CityView";
import { Footer, Header } from "@/components/Header";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ city: string }>; searchParams: Promise<{ view?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await getCity((await params).city);
  return { title: city ? `Plans in ${city.name}` : "City not found" };
}

export default async function CityPage({ params, searchParams }: Props) {
  const city = await getCity((await params).city);
  if (!city) notFound();
  const v = (await searchParams).view;
  const initialView = v === "swipe" || v === "list" || v === "map" ? v : "auto";
  const token = await userToken();
  const [venues, events, deck, profile] = await Promise.all([
    listVenues(city.slug),
    listEvents(city.slug, city.timezone, "all", []),
    getDeck(city.slug, city.timezone, "week", token, null, 0),
    previewMode() ? null : getProfile(token),
  ]);
  return (
    <>
      <Header city={city.slug} />
      <CityView city={city} venues={venues} initial={events} serverNow={nowUtc()} deck={deck} profile={profile} initialView={initialView} />
      <Footer />
    </>
  );
}

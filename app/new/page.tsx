import type { Metadata } from "next";
import { db } from "@/lib/db";
import { previewMode } from "@/lib/preview";
import { getCity, listCities, listVenues } from "@/lib/events";
import { createBounds, nowUtc } from "@/lib/tz";
import { NewPlanForm } from "@/components/NewPlanForm";
import { Footer, Header } from "@/components/Header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Start a plan" };

export default async function NewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  let citySlug = sp.city ?? "austin";
  let preVenueId: string | null = null;
  if (sp.venue && /^[0-9a-f-]{36}$/i.test(sp.venue) && !previewMode()) {
    const { data } = await db().from("venues").select("id, city_slug").eq("id", sp.venue).maybeSingle();
    if (data) {
      citySlug = data.city_slug;
      preVenueId = data.id;
    }
  }
  const city = (await getCity(citySlug)) ?? (await getCity("austin"));
  if (!city) throw new Error("Cities are not seeded — run npm run db:migrate");
  const [cities, venues] = await Promise.all([listCities(), listVenues(city.slug)]);
  return (
    <>
      <Header city={city.slug} />
      <NewPlanForm
        key={city.slug}
        city={city}
        cities={cities.map((c) => ({ slug: c.slug, name: c.name }))}
        venues={venues}
        preVenueId={preVenueId}
        bounds={createBounds(city.timezone, nowUtc())}
        asVenueDefault={sp.asVenue === "1"}
      />
      <Footer />
    </>
  );
}

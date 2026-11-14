import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCity, getDeck } from "@/lib/events";
import { userToken } from "@/lib/http";
import { getProfile } from "@/lib/profile";
import { previewMode } from "@/lib/preview";
import { nowUtc } from "@/lib/tz";
import { Footer, Header } from "@/components/Header";
import { SwipeDeck } from "@/components/SwipeDeck";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ city: string }>; searchParams: Promise<{ first?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await getCity((await params).city);
  return { title: city ? `Swipe plans in ${city.name.split(",")[0]}` : "City not found" };
}

export default async function SwipePage({ params, searchParams }: Props) {
  const city = await getCity((await params).city);
  if (!city) notFound();
  const sp = await searchParams;
  const first = sp.first && /^[a-z0-9]{4,20}$/.test(sp.first) ? sp.first : null;
  const token = await userToken();
  const [deck, profile] = await Promise.all([
    getDeck(city.slug, city.timezone, "week", token, first, 0),
    previewMode() ? null : getProfile(token),
  ]);
  return (
    <>
      <Header city={city.slug} />
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-16">
        <div className="mx-auto flex max-w-[420px] items-end justify-between gap-3">
          <h1 className="text-[28px] leading-none font-extrabold tracking-[-0.02em]">{city.name.split(",")[0]}</h1>
          <Link href={`/c/${city.slug}?view=list`} className="inline-flex min-h-11 items-center text-[15px] font-semibold underline">
            List view
          </Link>
        </div>
        <div className="mt-4">
          <SwipeDeck city={city} initial={deck} initialProfile={profile} first={first} serverNow={nowUtc()} />
        </div>
      </main>
      <Footer />
    </>
  );
}

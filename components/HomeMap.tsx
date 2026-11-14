"use client";
import { useRouter } from "next/navigation";
import type { City } from "@/lib/types";
import { MapView } from "./map";

export function HomeMap({ cities }: { cities: City[] }) {
  const router = useRouter();
  return (
    <MapView
      center={[39.5, -98.35]}
      zoom={4}
      pins={cities.map((c) => ({ id: c.slug, lat: c.centerLat, lng: c.centerLng, count: Math.max(c.openCount, 0) || undefined, title: c.name }))}
      onPinClick={(slug) => router.push(`/c/${slug}`)}
    />
  );
}

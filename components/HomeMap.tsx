"use client";
import { useRouter } from "next/navigation";
import type { City } from "@/lib/types";
import { MapView, QUIET_TILES } from "./map";

export function HomeMap({ cities }: { cities: City[] }) {
  const router = useRouter();
  return (
    <MapView
      center={[39.2, -97.5]}
      zoom={4}
      tiles={QUIET_TILES}
      zoomControl={false}
      pins={cities.map((c) => ({
        id: c.slug,
        lat: c.centerLat,
        lng: c.centerLng,
        count: c.openCount,
        label: c.name.split(",")[0],
        title: `${c.name}: ${c.openCount} open plans`,
      }))}
      onPinClick={(slug) => router.push(`/c/${slug}`)}
    />
  );
}

"use client";
import dynamic from "next/dynamic";

/** Client-only, lazy-loaded Leaflet map (Leaflet touches `window`; it can't render on the server). */
export const MapView = dynamic(() => import("./MapView.client"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-[#e9ebe6]" aria-label="Loading map" />,
});

export type { MapPin } from "./MapView.client";

"use client";
import dynamic from "next/dynamic";

/** Client-only, lazy-loaded Leaflet map (Leaflet touches `window`; it can't render on the server). */
export const MapView = dynamic(() => import("./MapView.client"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-[#e9ebe6]" aria-label="Loading map" />,
});

export type { MapPin } from "./MapView.client";

/** Quiet basemap for overview maps (kept here so importing it doesn't pull Leaflet into the server bundle). */
export const QUIET_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

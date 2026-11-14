"use client";
// Leaflet runs only in the browser. Import this file via next/dynamic with { ssr: false } (see components/map/index.tsx).
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  /** Number of open plans at this place; > 0 draws the highlighted letterboard pin. */
  count?: number;
  selected?: boolean;
  title?: string;
  popup?: React.ReactNode;
}

const TILES = process.env.NEXT_PUBLIC_MAP_TILES_URL || "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function iconFor(p: MapPin): L.DivIcon {
  if (p.selected) {
    return L.divIcon({
      className: "ifound-pin",
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      popupAnchor: [0, -36],
      html: `<svg width="34" height="42" viewBox="0 0 34 42" aria-hidden="true"><path d="M17 41C17 41 3 26.5 3 16a14 14 0 0128 0c0 10.5-14 25-14 25z" fill="#ffc83d" stroke="#16171a" stroke-width="2"/><circle cx="17" cy="16" r="5" fill="#16171a"/></svg>`,
    });
  }
  if (p.count && p.count > 0) {
    return L.divIcon({
      className: "ifound-pin",
      iconSize: [34, 30],
      iconAnchor: [17, 30],
      popupAnchor: [0, -28],
      html: `<div style="position:relative;width:34px;height:30px"><div class="felt" style="display:flex;align-items:center;justify-content:center;height:24px;border-radius:6px;border:1.5px solid #ffc83d"><span class="letter" style="font-size:15px;line-height:1;color:#ffc83d">${p.count}</span></div><div style="position:absolute;left:13px;bottom:0;width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:6px solid #ffc83d"></div></div>`,
    });
  }
  return L.divIcon({
    className: "ifound-pin",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
    html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:#fff;border:2.5px solid #16171a;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span>`,
  });
}

function ClickCatcher({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)) });
  return null;
}

function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom ?? Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [lat, lng, zoom, map]);
  return null;
}

export default function MapView({
  center,
  zoom,
  pins,
  onPinClick,
  onMapClick,
  focus,
  className = "",
  interactive = true,
}: {
  center: [number, number];
  zoom: number;
  pins: MapPin[];
  onPinClick?: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  className?: string;
  interactive?: boolean;
}) {
  const icons = useMemo(() => new Map(pins.map((p) => [p.id, iconFor(p)])), [pins]);
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={false}
      dragging={interactive}
      zoomControl={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      className={`h-full w-full ${className}`}
      attributionControl
    >
      <TileLayer url={TILES} attribution={ATTRIBUTION} />
      {onMapClick && <ClickCatcher onClick={onMapClick} />}
      {focus && <FlyTo lat={focus.lat} lng={focus.lng} zoom={focus.zoom} />}
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={icons.get(p.id)!}
          title={p.title}
          zIndexOffset={p.selected ? 1000 : p.count ? 500 : 0}
          eventHandlers={onPinClick ? { click: () => onPinClick(p.id) } : undefined}
        >
          {p.popup && <Popup>{p.popup}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}

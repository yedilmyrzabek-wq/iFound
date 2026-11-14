// One-off: pull venues from OpenStreetMap (Overpass) and write data/venues/<city>.json (TZ §5).
// The runtime never calls Overpass. Run:  npx tsx scripts/seed-venues.ts austin [--limit 30]
// Output is a pre-curated shortlist; a human trims it further by editing the JSON.
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// `pin`: hand-picked OSM refs (recognizable places, spread across the center, balanced categories).
// When set, it replaces the automatic shortlist for that city.
const CITIES: Record<string, { lat: number; lng: number; limit: number; pin?: string[] }> = {
  austin: {
    lat: 30.2672,
    lng: -97.7431,
    limit: 31,
    pin: [
      // cafes
      "node/919335942", "node/2507491258", "node/3190877885", "node/3190890891", "node/3533712652", "node/5771559041",
      "node/3849779903", "node/8931050056", "node/10563618404", "node/13947744901", "node/13776620882", "node/13787879801",
      // parks
      "way/92460015", "way/903143008", "way/326162404", "way/349698359", "way/208167635", "way/1100976990",
      "way/971507719", "way/97336071", "way/732242104",
      // cinemas, libraries, community centers, soccer fields
      "node/661314999", "node/8958597082", "node/5771241709",
      "node/12923867753", "node/13912750063",
      "node/13787540401", "node/4966406025",
      "way/188589239", "way/481663868", "way/588145879",
    ],
  },
  "new-york": { lat: 40.7128, lng: -74.006, limit: 14 },
  chicago: { lat: 41.8781, lng: -87.6298, limit: 14 },
  denver: { lat: 39.7392, lng: -104.9903, limit: 14 },
  seattle: { lat: 47.6062, lng: -122.3321, limit: 14 },
};

type Category = "cafe" | "game_store" | "park" | "pitch" | "cinema" | "library" | "community_centre";

interface OsmEl {
  type: "node" | "way";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface SeedVenue {
  osm_ref: string;
  name: string;
  address: string | null;
  category: Category;
  lat: number;
  lng: number;
}

function query(lat: number, lng: number): string {
  const L = `${lat},${lng}`;
  return `[out:json][timeout:90];
(
  node["amenity"="cafe"]["name"](around:4000,${L});
  node["shop"="games"]["name"](around:8000,${L});
  node["amenity"="cinema"]["name"](around:8000,${L});
  node["amenity"="library"]["name"](around:6000,${L});
  node["amenity"="community_centre"]["name"](around:6000,${L});
  way["leisure"="park"]["name"](around:6000,${L});
  way["leisure"="pitch"]["sport"="soccer"](around:10000,${L});
);
out center tags;`;
}

function categoryOf(t: Record<string, string>): Category | null {
  if (t.amenity === "cafe") return "cafe";
  if (t.shop === "games") return "game_store";
  if (t.amenity === "cinema") return "cinema";
  if (t.amenity === "library") return "library";
  if (t.amenity === "community_centre") return "community_centre";
  if (t.leisure === "park") return "park";
  if (t.leisure === "pitch") return "pitch";
  return null;
}

// Bars, pubs and nightclubs are never in the query (18+ without alcohol in the seed). Also drop chains
// that read as generic — the shortlist should feel local and recognizable.
const SKIP_NAME = /\b(starbucks|dunkin|mcdonald|7-eleven|shell)\b/i;

function toVenue(el: OsmEl): SeedVenue | null {
  const t = el.tags ?? {};
  const category = categoryOf(t);
  if (!category) return null;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;
  const address = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ") || null;
  let name = t.name?.trim();
  if (!name && category === "pitch") {
    const near = t["addr:street"] || t["is_in"];
    if (!near && !address) return null; // nameless pitch without an address: drop
    name = `Soccer field, ${near ?? address}`;
  }
  if (!name || name.length > 80 || SKIP_NAME.test(name)) return null;
  return { osm_ref: `${el.type}/${el.id}`, name, address, category, lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
}

function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng) * 6371;
}

/** Balanced shortlist: per-category quotas, closest to center first, with richer OSM entries preferred. */
function curate(all: SeedVenue[], center: { lat: number; lng: number }, limit: number, raw: Map<string, Record<string, string>>) {
  const share: Record<Category, number> = {
    cafe: 0.3, park: 0.2, game_store: 0.12, pitch: 0.12, cinema: 0.1, library: 0.1, community_centre: 0.06,
  };
  const seenNames = new Set<string>();
  const unique = all.filter((v) => {
    const k = v.name.toLowerCase();
    if (seenNames.has(k)) return false;
    seenNames.add(k);
    return true;
  });
  const score = (v: SeedVenue) => {
    const t = raw.get(v.osm_ref) ?? {};
    const richness = (t.website ? 1 : 0) + (t.opening_hours ? 1 : 0) + (v.address ? 1 : 0) + (t.wikidata ? 2 : 0);
    return distKm(center, v) - richness * 0.6;
  };
  const picked: SeedVenue[] = [];
  for (const cat of Object.keys(share) as Category[]) {
    const quota = Math.max(1, Math.round(share[cat] * limit));
    picked.push(...unique.filter((v) => v.category === cat).sort((a, b) => score(a) - score(b)).slice(0, quota));
  }
  if (picked.length < limit) {
    const rest = unique.filter((v) => !picked.includes(v)).sort((a, b) => score(a) - score(b));
    picked.push(...rest.slice(0, limit - picked.length));
  }
  return picked.slice(0, limit).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

async function run(slug: string, limitOverride?: number) {
  const c = CITIES[slug];
  if (!c) throw new Error(`Unknown city ${slug}`);
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ifound-seed/1.0" },
    body: "data=" + encodeURIComponent(query(c.lat, c.lng)),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { elements: OsmEl[] };
  const raw = new Map(json.elements.map((e) => [`${e.type}/${e.id}`, e.tags ?? {}]));
  const all = json.elements.map(toVenue).filter((v): v is SeedVenue => !!v);
  const byRef = new Map(all.map((v) => [v.osm_ref, v]));
  const picked = c.pin
    ? c.pin.map((ref) => byRef.get(ref)).filter((v): v is SeedVenue => !!v)
    : curate(all, c, limitOverride ?? c.limit, raw);
  if (c.pin && picked.length < c.pin.length) console.warn(`${slug}: ${c.pin.length - picked.length} pinned refs not found`);
  const dir = path.join(process.cwd(), "data", "venues");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${slug}.json`), JSON.stringify(picked, null, 2) + "\n");
  const byCat = picked.reduce<Record<string, number>>((m, v) => ((m[v.category] = (m[v.category] ?? 0) + 1), m), {});
  console.log(`${slug}: ${json.elements.length} raw → ${all.length} usable → ${picked.length} picked`, byCat);
}

const args = process.argv.slice(2);
const li = args.indexOf("--limit");
const limit = li >= 0 ? Number(args[li + 1]) : undefined;
const slugs = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--limit");
(async () => {
  for (const s of slugs.length ? slugs : Object.keys(CITIES)) {
    await run(s, limit);
    await new Promise((r) => setTimeout(r, 3000)); // be polite to the public Overpass instance
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

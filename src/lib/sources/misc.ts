import type { FeatureCollection, Geometry } from "geojson";
import type { FetchContext, LayerData } from "../../types";
import { fc, getJSON, point } from "../util";

// ── USGS earthquakes (last 24h, M2.5+) ───────────────────────────────────────
// https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php (CORS-enabled)
interface UsgsFeed {
  features: Array<{
    geometry: { coordinates: [number, number, number] };
    properties: { mag: number; place: string; time: number; url: string };
  }>;
}

export async function fetchEarthquakes(ctx: FetchContext): Promise<LayerData> {
  const url =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
  const data = await getJSON<UsgsFeed>(url, { signal: ctx.signal });
  const feats = data.features.map((f) =>
    point(f.geometry.coordinates[0], f.geometry.coordinates[1], {
      title: f.properties.place,
      magnitude: f.properties.mag,
      depth_km: f.geometry.coordinates[2],
      time: new Date(f.properties.time).toISOString(),
      url: f.properties.url,
      kind: "Earthquake",
    })
  );
  return { geojson: fc(feats) };
}

// ── GPSJam — daily aggregated GPS interference from aircraft nav data ─────────
// https://gpsjam.org  (daily GeoJSON of H3 hexes with good/bad nav counts)
function dateStr(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

interface GpsJamFeed {
  features: Array<{
    geometry: { type: string; coordinates: number[][][] };
    properties: { count?: number; bad?: number; good?: number };
  }>;
}

function centroid(ring: number[][]): [number, number] {
  let x = 0;
  let y = 0;
  for (const [lon, lat] of ring) {
    x += lon;
    y += lat;
  }
  return [x / ring.length, y / ring.length];
}

export async function fetchGpsJamming(ctx: FetchContext): Promise<LayerData> {
  // Yesterday's data is the most recent complete dataset; fall back further.
  let data: GpsJamFeed | null = null;
  for (const days of [1, 2, 3]) {
    try {
      data = await getJSON<GpsJamFeed>(
        `https://gpsjam.org/data/${dateStr(days)}-geojson.geojson`,
        { signal: ctx.signal, timeoutMs: 25000 }
      );
      if (data?.features?.length) break;
    } catch {
      /* try previous day */
    }
  }
  if (!data?.features?.length) {
    return { geojson: fc([]), note: "GPSJam daily data unavailable right now." };
  }
  const feats = data.features
    .filter((f) => (f.properties.bad ?? 0) > 0 && f.geometry.coordinates?.[0])
    .map((f) => {
      const [lon, lat] = centroid(f.geometry.coordinates[0]);
      const bad = f.properties.bad ?? 0;
      const good = f.properties.good ?? 0;
      return point(lon, lat, {
        title: "GPS interference",
        aircraft_bad_nav: bad,
        aircraft_good_nav: good,
        ratio: good + bad > 0 ? +(bad / (good + bad)).toFixed(2) : 0,
        kind: "GPS jamming/spoofing (measured)",
      });
    });
  return { geojson: fc(feats) };
}

export type { FeatureCollection, Geometry };

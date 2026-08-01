import type { FeatureCollection, Geometry } from "geojson";
import type { FetchContext, LayerData, NewsItem } from "../../types";
import { fc, getJSON } from "../util";

// GDELT 2.0 — global news-event monitoring across thousands of outlets worldwide.
// GEO API returns geolocated event clusters as GeoJSON; DOC API returns articles.
// Docs: https://blog.gdeltproject.org/gdelt-geo-2-0-api-debuts/  (CORS-enabled)

function geoUrl(query: string, timespan: string): string {
  return (
    `https://api.gdeltproject.org/api/v2/geo/geo` +
    `?query=${encodeURIComponent(query)}&format=geojson&timespan=${timespan}&maxpoints=400`
  );
}

interface GdeltGeo {
  features?: Array<{
    geometry?: { type: string; coordinates: [number, number] };
    properties?: Record<string, unknown>;
  }>;
}

function makeGeoFetcher(query: string, kind: string, timespan = "3d") {
  return async (ctx: FetchContext): Promise<LayerData> => {
    const data = await getJSON<GdeltGeo>(geoUrl(query, timespan), {
      signal: ctx.signal,
      timeoutMs: 25000,
    });
    const feats = (data.features ?? [])
      .filter((f) => f.geometry?.type === "Point" && f.geometry.coordinates)
      .map((f) => ({
        type: "Feature" as const,
        geometry: f.geometry as Geometry,
        properties: {
          title: (f.properties?.name as string) ?? kind,
          count: f.properties?.count ?? null,
          html: f.properties?.html ?? null,
          kind,
        },
      }));
    return {
      geojson: fc(feats),
      note: feats.length === 0 ? "No geolocated reports in this window." : undefined,
    };
  };
}

// Curated GDELT queries (boolean syntax) for each security layer.
export const fetchConflictZones = makeGeoFetcher(
  '(armed clash OR airstrike OR shelling OR offensive OR militants OR insurgents)',
  "Conflict event",
  "3d"
);
export const fetchWarMonitor = makeGeoFetcher(
  '("frontline" OR "missile strike" OR "drone strike" OR bombardment OR "ground assault" OR casualties)',
  "Active war event",
  "1d"
);
export const fetchProtests = makeGeoFetcher(
  '(protest OR demonstration OR "civil unrest" OR riot OR strike OR rally)',
  "Protest / unrest",
  "2d"
);
export const fetchDiseaseOutbreaks = makeGeoFetcher(
  '("disease outbreak" OR epidemic OR "confirmed cases" OR quarantine OR "public health emergency")',
  "Disease outbreak report",
  "5d"
);
export const fetchCyberThreats = makeGeoFetcher(
  '(cyberattack OR ransomware OR "data breach" OR "ddos" OR "hacking group" OR malware)',
  "Cyber incident",
  "3d"
);
export const fetchInternetOutages = makeGeoFetcher(
  '("internet shutdown" OR "internet outage" OR "connectivity disruption" OR "network blackout" OR "internet blackout")',
  "Internet outage report",
  "5d"
);
export const fetchGpsJammingNews = makeGeoFetcher(
  '("gps jamming" OR "gps spoofing" OR "navigation interference" OR "signal jamming")',
  "GPS jamming report",
  "5d"
);

// ── News feed (DOC API) ──────────────────────────────────────────────────────
interface GdeltDoc {
  articles?: Array<{
    url: string;
    title: string;
    seendate?: string;
    domain?: string;
    sourcecountry?: string;
  }>;
}

function parseSeenDate(s?: string): string | undefined {
  // GDELT format: YYYYMMDDTHHMMSSZ
  if (!s || s.length < 15) return undefined;
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(
    9,
    11
  )}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;
  return iso;
}

export async function fetchNews(
  query: string,
  signal?: AbortSignal,
  maxrecords = 75
): Promise<NewsItem[]> {
  const url =
    `https://api.gdeltproject.org/api/v2/doc/doc` +
    `?query=${encodeURIComponent(query)}&format=json&mode=artlist` +
    `&maxrecords=${maxrecords}&sort=datedesc`;
  const data = await getJSON<GdeltDoc>(url, { signal, timeoutMs: 25000 });
  return (data.articles ?? []).map((a) => ({
    title: a.title,
    url: a.url,
    source: a.domain ?? a.sourcecountry ?? "news",
    domain: a.domain,
    publishedAt: parseSeenDate(a.seendate),
  }));
}

export type { FeatureCollection, Geometry };

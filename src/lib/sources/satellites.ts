import * as satellite from "satellite.js";
import type { FetchContext, LayerData } from "../../types";
import { fc, getText, point } from "../util";

// CelesTrak — General Perturbations (GP) orbital element sets (TLE).
// Docs: https://celestrak.org/NORAD/documentation/gp-data-formats.php
// We download TLEs and propagate each satellite to "now" with SGP4 in the
// browser, so the displayed sub-satellite points are real & live, not faked.

interface TLE {
  name: string;
  l1: string;
  l2: string;
}

function parseTLE(text: string): TLE[] {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
  const out: TLE[] = [];
  for (let i = 0; i + 2 < lines.length || i + 2 === lines.length; i += 3) {
    const name = lines[i]?.trim();
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!name || !l1 || !l2) break;
    if (!l1.startsWith("1 ") || !l2.startsWith("2 ")) break;
    out.push({ name, l1, l2 });
  }
  return out;
}

function subPoint(tle: TLE, when: Date) {
  try {
    const satrec = satellite.twoline2satrec(tle.l1, tle.l2);
    const pv = satellite.propagate(satrec, when);
    if (!pv || typeof pv.position === "boolean" || !pv.position) return null;
    const gmst = satellite.gstime(when);
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const lon = satellite.degreesLong(geo.longitude);
    const lat = satellite.degreesLat(geo.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    return { lon, lat, alt_km: Math.round(geo.height) };
  } catch {
    return null;
  }
}

const cache = new Map<string, { ts: number; tles: TLE[] }>();

async function loadGroup(group: string, signal?: AbortSignal): Promise<TLE[]> {
  const c = cache.get(group);
  // TLEs change slowly; cache for 30 min.
  if (c && Date.now() - c.ts < 30 * 60 * 1000) return c.tles;
  const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(
    group
  )}&FORMAT=tle`;
  const text = await getText(url, { signal, timeoutMs: 25000 });
  const tles = parseTLE(text);
  cache.set(group, { ts: Date.now(), tles });
  return tles;
}

function makeGroupFetcher(group: string, label: string, max = 2000) {
  return async (ctx: FetchContext): Promise<LayerData> => {
    const tles = await loadGroup(group, ctx.signal);
    const now = new Date();
    const feats = [];
    for (const tle of tles.slice(0, max)) {
      const sp = subPoint(tle, now);
      if (!sp) continue;
      feats.push(
        point(sp.lon, sp.lat, {
          title: tle.name.trim(),
          alt_km: sp.alt_km,
          kind: label,
        })
      );
    }
    return {
      geojson: fc(feats),
      note: feats.length === 0 ? "No TLEs returned (CelesTrak rate limit?)." : undefined,
    };
  };
}

export const fetchSpaceStations = makeGroupFetcher("stations", "Space station");
export const fetchStarlink = makeGroupFetcher("starlink", "Starlink satellite", 3000);
export const fetchGnss = makeGroupFetcher("gnss", "Navigation satellite");
export const fetchMilitarySats = makeGroupFetcher("military", "Military / recon satellite");

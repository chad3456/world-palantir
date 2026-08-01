import * as satellite from "satellite.js";
import { getText } from "../util";

// Shared CelesTrak GP/TLE loading + SGP4 propagation.
// TLEs are downloaded once per group and cached; sub-satellite points are
// recomputed for the current instant on every refresh, so displayed positions
// are genuinely live rather than pre-baked tracks.

export interface TLE {
  name: string;
  l1: string;
  l2: string;
}

export function parseTLE(text: string): TLE[] {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
  const out: TLE[] = [];
  for (let i = 0; i + 2 <= lines.length; i += 3) {
    const name = lines[i]?.trim();
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!name || !l1 || !l2) break;
    if (!l1.startsWith("1 ") || !l2.startsWith("2 ")) break;
    out.push({ name, l1, l2 });
  }
  return out;
}

export function subPoint(tle: TLE, when: Date) {
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

const CACHE_MS = 30 * 60 * 1000;
const cache = new Map<string, { ts: number; tles: TLE[] }>();
/** Groups that returned an error, so we don't hammer a bad identifier. */
const failed = new Map<string, number>();

export function groupUrl(group: string): string {
  return `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(
    group
  )}&FORMAT=tle`;
}

/**
 * Load a CelesTrak group. Returns [] if the group is unknown or unreachable —
 * callers treat that as "unavailable", never as fabricated data.
 */
export async function loadGroup(group: string, signal?: AbortSignal): Promise<TLE[]> {
  const hit = cache.get(group);
  if (hit && Date.now() - hit.ts < CACHE_MS) return hit.tles;

  const lastFail = failed.get(group);
  if (lastFail && Date.now() - lastFail < CACHE_MS) return [];

  try {
    const text = await getText(groupUrl(group), { signal, timeoutMs: 25000 });
    // CelesTrak answers an unknown group with a short HTML/text notice.
    if (!text || text.length < 100 || /no gp data|invalid|<html/i.test(text.slice(0, 300))) {
      failed.set(group, Date.now());
      return [];
    }
    const tles = parseTLE(text);
    if (tles.length === 0) {
      failed.set(group, Date.now());
      return [];
    }
    cache.set(group, { ts: Date.now(), tles });
    failed.delete(group);
    return tles;
  } catch {
    failed.set(group, Date.now());
    return [];
  }
}

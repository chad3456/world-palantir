import type { FetchContext, LayerData } from "../../types";
import { fc, point } from "../util";
import { loadGroup, subPoint } from "./tle";

// Government / general-interest satellite groups from CelesTrak.
// Commercial operators live in ./commercial-sats.ts. Both share the TLE + SGP4
// engine in ./tle.ts, so positions are propagated to the current instant.

function makeGroupFetcher(group: string, label: string, max = 3000) {
  return async (ctx: FetchContext): Promise<LayerData> => {
    const tles = await loadGroup(group, ctx.signal);
    if (tles.length === 0) {
      return { geojson: fc([]), note: "CelesTrak returned no elements right now." };
    }
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
    return { geojson: fc(feats) };
  };
}

export const fetchSpaceStations = makeGroupFetcher("stations", "Space station");
export const fetchStarlink = makeGroupFetcher("starlink", "Starlink satellite");
export const fetchGnss = makeGroupFetcher("gnss", "Navigation satellite");
export const fetchMilitarySats = makeGroupFetcher("military", "Military / recon satellite");

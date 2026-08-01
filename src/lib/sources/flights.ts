import type { FetchContext, LayerData } from "../../types";
import { env, fc, getJSON, point } from "../util";

// OpenSky Network — live ADS-B aircraft state vectors.
// Docs: https://openskynetwork.github.io/opensky-api/rest.html
// CORS-enabled. Anonymous is rate-limited; basic-auth raises limits.

interface OpenSkyResponse {
  time: number;
  states: Array<Array<number | string | boolean | null>> | null;
}

// Known military callsign prefixes (NATO/US/allied) for the "military" classifier.
const MIL_PREFIXES = [
  "RCH", "REACH", "RRR", "CFC", "ASCOT", "BAF", "NATO", "FORTE", "HOMER",
  "PYTHON", "GRZLY", "JAKE", "DOOM", "SLAM", "KING", "QID", "RFR", "IAM",
  "VIVI", "MMF", "POLAR", "GAF", "CTM", "AME", "NAF", "HKY", "TARTN",
];

function isMilitary(callsign: string): boolean {
  const c = callsign.trim().toUpperCase();
  if (!c) return false;
  return MIL_PREFIXES.some((p) => c.startsWith(p));
}

async function fetchOpenSky(ctx: FetchContext): Promise<OpenSkyResponse> {
  const [w, s, e, n] = ctx.bounds;
  const url =
    `https://opensky-network.org/api/states/all` +
    `?lamin=${s.toFixed(3)}&lomin=${w.toFixed(3)}&lamax=${n.toFixed(3)}&lomax=${e.toFixed(3)}`;
  const user = env("VITE_OPENSKY_USER");
  const pass = env("VITE_OPENSKY_PASS");
  const headers: Record<string, string> = {};
  if (user && pass) headers.Authorization = "Basic " + btoa(`${user}:${pass}`);
  return getJSON<OpenSkyResponse>(url, { signal: ctx.signal, headers, timeoutMs: 25000 });
}

function toFeatures(data: OpenSkyResponse, militaryOnly: boolean): LayerData {
  const states = data.states ?? [];
  const feats = [];
  for (const st of states) {
    const lon = st[5] as number | null;
    const lat = st[6] as number | null;
    if (lon == null || lat == null) continue;
    const callsign = ((st[1] as string) ?? "").trim();
    const mil = isMilitary(callsign);
    if (militaryOnly && !mil) continue;
    if (!militaryOnly && mil) continue; // commercial layer excludes military
    feats.push(
      point(lon, lat, {
        title: callsign || (st[0] as string),
        icao24: st[0],
        origin: st[2],
        altitude_m: st[7] ?? st[13] ?? null,
        velocity_ms: st[9] ?? null,
        heading: st[10] ?? null,
        on_ground: st[8] ?? null,
        military: mil,
        kind: mil ? "Military aircraft" : "Commercial aircraft",
      })
    );
  }
  return {
    geojson: fc(feats),
    note: feats.length === 0 ? "No aircraft in view (or OpenSky rate limit hit)." : undefined,
  };
}

export async function fetchCommercialFlights(ctx: FetchContext): Promise<LayerData> {
  const data = await fetchOpenSky(ctx);
  return toFeatures(data, false);
}

export async function fetchMilitaryFlights(ctx: FetchContext): Promise<LayerData> {
  const data = await fetchOpenSky(ctx);
  return toFeatures(data, true);
}

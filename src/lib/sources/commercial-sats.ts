import type { FetchContext, LayerData } from "../../types";
import { fc, point } from "../util";
import { loadGroup, subPoint } from "./tle";

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE / COMMERCIAL SATELLITE OPERATORS
//
// Live positions come from CelesTrak GP element sets (public, no key), tagged
// with curated operator metadata. Counts are NEVER hard-coded — the number of
// objects shown is whatever the catalogue currently returns, propagated to the
// present instant with SGP4. Constellations change weekly, so a baked-in count
// would be wrong within days.
//
// `verified` records whether the CelesTrak GROUP identifier was confirmed
// against public documentation. Unverified groups fail closed: the operator
// simply reports "unavailable" rather than showing anything invented.
// ─────────────────────────────────────────────────────────────────────────────

export interface Operator {
  id: string;
  /** CelesTrak GROUP= identifier. */
  group: string;
  name: string;
  company: string;
  country: string;
  /** What the constellation does. */
  purpose: string;
  orbit: "LEO" | "MEO" | "GEO" | "mixed";
  color: string;
  notes?: string;
  verified: boolean;
}

export const OPERATORS: Operator[] = [
  {
    id: "starlink", group: "starlink",
    name: "Starlink", company: "SpaceX", country: "United States",
    purpose: "Broadband internet", orbit: "LEO", color: "#8fb4ff",
    notes: "Largest constellation ever deployed; includes Direct-to-Cell variants.",
    verified: true,
  },
  {
    id: "oneweb", group: "oneweb",
    name: "OneWeb", company: "Eutelsat OneWeb", country: "United Kingdom / France",
    purpose: "Broadband internet", orbit: "LEO", color: "#4ecdc4",
    notes: "Merged with Eutelsat in 2023; enterprise and government backhaul.",
    verified: true,
  },
  {
    id: "kuiper", group: "kuiper",
    name: "Amazon Leo (Kuiper)", company: "Amazon", country: "United States",
    purpose: "Broadband internet", orbit: "LEO", color: "#ffa652",
    notes: "Project Kuiper; rebranded Amazon Leo in late 2025. Deployment ongoing.",
    verified: true,
  },
  {
    id: "qianfan", group: "qianfan",
    name: "Qianfan / Thousand Sails", company: "Shanghai Spacecom (SSST)", country: "China",
    purpose: "Broadband internet", orbit: "LEO", color: "#ff6b6b",
    notes: "Chinese mega-constellation, also reported as G60 Starlink.",
    verified: true,
  },
  {
    id: "planet", group: "planet",
    name: "Planet Labs", company: "Planet Labs PBC", country: "United States",
    purpose: "Earth imaging", orbit: "LEO", color: "#35d07f",
    notes: "Dove/SuperDove daily-revisit fleet plus higher-resolution SkySat.",
    verified: true,
  },
  {
    id: "spire", group: "spire",
    name: "Spire Global", company: "Spire Global", country: "United States",
    purpose: "Weather, AIS & ADS-B sensing", orbit: "LEO", color: "#c9a227",
    notes: "LEMUR cubesats; feeds maritime AIS and aviation tracking data.",
    verified: true,
  },
  {
    id: "iridium", group: "iridium-NEXT",
    name: "Iridium NEXT", company: "Iridium Communications", country: "United States",
    purpose: "Voice, data & IoT", orbit: "LEO", color: "#a78bfa",
    notes: "Cross-linked polar constellation with true global coverage.",
    verified: true,
  },
  {
    id: "globalstar", group: "globalstar",
    name: "Globalstar", company: "Globalstar", country: "United States",
    purpose: "Satellite phone & IoT", orbit: "LEO", color: "#f06292",
    notes: "Carries emergency satellite messaging for consumer handsets.",
    verified: true,
  },
  {
    id: "orbcomm", group: "orbcomm",
    name: "ORBCOMM", company: "ORBCOMM", country: "United States",
    purpose: "IoT / M2M messaging", orbit: "LEO", color: "#26c6da",
    notes: "Asset tracking and machine-to-machine telemetry.",
    verified: true,
  },
  {
    id: "intelsat", group: "intelsat",
    name: "Intelsat", company: "Intelsat (SES group)", country: "Luxembourg / United States",
    purpose: "GEO communications", orbit: "GEO", color: "#ffd166",
    notes: "Acquired by SES; long-standing geostationary fleet.",
    verified: true,
  },
  {
    id: "ses", group: "ses",
    name: "SES", company: "SES S.A.", country: "Luxembourg",
    purpose: "GEO & MEO communications", orbit: "mixed", color: "#b388ff",
    notes: "Includes the O3b MEO fleet. Group identifier unconfirmed.",
    verified: false,
  },
  {
    id: "swarm", group: "swarm",
    name: "Swarm", company: "Swarm Technologies (SpaceX)", country: "United States",
    purpose: "Low-bandwidth IoT", orbit: "LEO", color: "#90a4ae",
    notes: "SpaceX subsidiary; service being wound down. Identifier unconfirmed.",
    verified: false,
  },
];

export const OPERATORS_BY_ID: Record<string, Operator> = Object.fromEntries(
  OPERATORS.map((o) => [o.id, o])
);

function toFeatures(tles: { name: string; l1: string; l2: string }[], op: Operator) {
  const now = new Date();
  const feats = [];
  for (const t of tles) {
    const sp = subPoint(t, now);
    if (!sp) continue;
    feats.push(
      point(sp.lon, sp.lat, {
        title: t.name.trim(),
        operator: op.name,
        company: op.company,
        country: op.country,
        purpose: op.purpose,
        orbit: op.orbit,
        alt_km: sp.alt_km,
        color: op.color,
        kind: "Commercial satellite",
      })
    );
  }
  return feats;
}

/** One operator's constellation. */
export function fetchOperator(id: string) {
  return async (ctx: FetchContext): Promise<LayerData> => {
    const op = OPERATORS_BY_ID[id];
    if (!op) return { geojson: fc([]), note: "Unknown operator." };
    const tles = await loadGroup(op.group, ctx.signal);
    if (tles.length === 0) {
      return {
        geojson: fc([]),
        note: op.verified
          ? "CelesTrak returned no elements for this group right now."
          : `CelesTrak group "${op.group}" is unconfirmed and returned nothing.`,
      };
    }
    return { geojson: fc(toFeatures(tles, op)) };
  };
}

/** Every commercial operator at once, coloured per operator. */
export async function fetchAllCommercial(ctx: FetchContext): Promise<LayerData> {
  const results = await Promise.all(
    OPERATORS.map(async (op) => ({ op, tles: await loadGroup(op.group, ctx.signal) }))
  );
  const feats = [];
  const loaded: string[] = [];
  const missing: string[] = [];
  for (const { op, tles } of results) {
    if (tles.length === 0) {
      missing.push(op.name);
      continue;
    }
    loaded.push(op.name);
    feats.push(...toFeatures(tles, op));
  }
  if (feats.length === 0) {
    return { geojson: fc([]), note: "No operator catalogues reachable right now." };
  }
  return {
    geojson: fc(feats),
    note: missing.length
      ? `${loaded.length} operators loaded; unavailable: ${missing.join(", ")}.`
      : undefined,
  };
}

import type { FetchContext, LayerData } from "../../types";
import { fc, getJSON, point } from "../util";

// ─────────────────────────────────────────────────────────────────────────────
// INFORMATION-WARFARE / PsyOps INDEX  (open, reproducible composite — 0..100)
//
// There is no official "PsyOps index", so we compute a transparent composite of
// REAL inputs. Nothing is invented:
//
//   baseline (published, per country, public/data/psyops-baseline.json):
//     • cyber_troop_capacity   — Oxford OII "Industrialized Disinformation"
//     • foreign_influence_ops  — runs ops targeting foreign audiences (Oxford)
//     • freedom_on_net         — Freedom House (inverted → state info-control)
//
//   live signal (aggregated each refresh):
//     • GDELT volume of disinformation / propaganda / influence-operation
//       reporting attributed to the country, normalised 0..100 across countries.
//
//   index = wBase*baseline + wLive*live   (renormalised if live is unavailable)
//
// Weights and caveats are documented in docs/PSYOPS_INDEX.md.
// ─────────────────────────────────────────────────────────────────────────────

const WEIGHTS = { capacity: 0.4, infoControl: 0.25, foreignOps: 0.1, live: 0.25 };

const CAPACITY_SCORE: Record<string, number> = {
  high: 100,
  medium: 66,
  low: 33,
  minimal: 15,
  none: 0,
};

interface BaselineRow {
  country: string;
  iso3: string;
  lat: number;
  lon: number;
  cyber_troop_capacity: keyof typeof CAPACITY_SCORE | null;
  foreign_influence_ops: boolean | null;
  freedom_on_net: number | null;
  notes?: string;
  sources?: string;
}

// GDELT query capturing organised information-warfare reporting.
const INFO_WAR_QUERY =
  '(disinformation OR propaganda OR "influence operation" OR "information warfare" OR "troll farm" OR "state media" OR "foreign interference" OR "psychological operations")';

async function loadBaseline(signal?: AbortSignal): Promise<BaselineRow[]> {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  try {
    const rows = await getJSON<BaselineRow[]>(`${base}data/psyops-baseline.json`, { signal });
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

interface GdeltGeo {
  features?: Array<{ properties?: { name?: string; count?: number } }>;
}

/** Aggregate GDELT info-war report counts per country name. */
async function liveActivityByCountry(
  signal?: AbortSignal
): Promise<Map<string, number>> {
  const url =
    `https://api.gdeltproject.org/api/v2/geo/geo` +
    `?query=${encodeURIComponent(INFO_WAR_QUERY)}&format=geojson&timespan=7d&maxpoints=2000`;
  const counts = new Map<string, number>();
  try {
    const data = await getJSON<GdeltGeo>(url, { signal, timeoutMs: 25000 });
    for (const f of data.features ?? []) {
      const name = f.properties?.name ?? "";
      // GDELT location names are like "City, Region, Country" — country is last.
      const country = name.split(",").pop()?.trim().toLowerCase();
      if (!country) continue;
      counts.set(country, (counts.get(country) ?? 0) + (Number(f.properties?.count) || 1));
    }
  } catch {
    /* live signal optional — fall back to baseline-only */
  }
  return counts;
}

// A few aliases so GDELT country strings match our baseline names.
const ALIAS: Record<string, string> = {
  "united states": "united states",
  usa: "united states",
  "united states of america": "united states",
  "united kingdom": "united kingdom",
  uk: "united kingdom",
  "south korea": "south korea",
  "republic of korea": "south korea",
  "north korea": "north korea",
  "russian federation": "russia",
  "united arab emirates": "united arab emirates",
  uae: "united arab emirates",
};

function matchLive(countryName: string, live: Map<string, number>): number {
  const key = countryName.trim().toLowerCase();
  if (live.has(key)) return live.get(key)!;
  const alias = ALIAS[key];
  if (alias && live.has(alias)) return live.get(alias)!;
  return 0;
}

export async function fetchPsyopsIndex(ctx: FetchContext): Promise<LayerData> {
  const [baseline, live] = await Promise.all([
    loadBaseline(ctx.signal),
    liveActivityByCountry(ctx.signal),
  ]);
  if (baseline.length === 0) {
    return { geojson: fc([]), note: "psyops-baseline.json not found." };
  }

  const haveLive = live.size > 0;
  const maxLive = Math.max(1, ...[...live.values()]);

  // Renormalise weights if the live signal is unavailable this refresh.
  const w = haveLive
    ? WEIGHTS
    : (() => {
        const s = WEIGHTS.capacity + WEIGHTS.infoControl + WEIGHTS.foreignOps;
        return { capacity: WEIGHTS.capacity / s, infoControl: WEIGHTS.infoControl / s, foreignOps: WEIGHTS.foreignOps / s, live: 0 };
      })();

  const feats = baseline
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon))
    .map((r) => {
      const capacity =
        r.cyber_troop_capacity != null ? CAPACITY_SCORE[r.cyber_troop_capacity] ?? 0 : 0;
      // Freedom on the Net: low score = high state info-control.
      const infoControl = r.freedom_on_net != null ? 100 - r.freedom_on_net : 50;
      const foreignOps = r.foreign_influence_ops ? 100 : 0;
      const liveRaw = matchLive(r.country, live);
      const liveScore = haveLive ? Math.round((liveRaw / maxLive) * 100) : 0;

      const index = Math.round(
        w.capacity * capacity +
          w.infoControl * infoControl +
          w.foreignOps * foreignOps +
          w.live * liveScore
      );

      return point(r.lon, r.lat, {
        title: `${r.country} — Info-War Index ${index}`,
        country: r.country,
        index,
        capacity_rating: r.cyber_troop_capacity ?? "n/a",
        capacity_score: capacity,
        info_control_score: infoControl,
        foreign_influence_ops: r.foreign_influence_ops ?? "n/a",
        live_activity_score: liveScore,
        live_reports_7d: liveRaw,
        freedom_on_net: r.freedom_on_net ?? "n/a",
        notes: r.notes ?? "",
        sources: r.sources ?? "",
        kind: "Information-warfare index",
      });
    })
    .sort((a, b) => (b.properties!.index as number) - (a.properties!.index as number));

  // annotate rank
  feats.forEach((f, i) => (f.properties!.rank = i + 1));

  return {
    geojson: fc(feats),
    note: haveLive
      ? undefined
      : "Live GDELT signal unavailable — showing capability baseline only.",
  };
}

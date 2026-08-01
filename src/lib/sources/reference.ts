import type { FetchContext, LayerData } from "../../types";
import { fc, getJSON, loadReference, point } from "../util";

// Reference layers load curated, real-world GeoJSON shipped in /public/data.
// These are authoritative published facts (facility locations, cable routes,
// arsenal estimates), not simulated data. Provenance is documented in
// docs/DATA_SOURCES.md.

function makeRefFetcher(file: string) {
  return async (ctx: FetchContext): Promise<LayerData> => {
    const geojson = await loadReference(file, ctx.signal);
    return {
      geojson,
      note:
        geojson.features.length === 0
          ? `Dataset ${file} not found or empty.`
          : undefined,
    };
  };
}

export const fetchChokepoints = makeRefFetcher("chokepoints.json");
export const fetchSpaceports = makeRefFetcher("spaceports.json");
export const fetchNuclearSites = makeRefFetcher("nuclear-sites.json");
export const fetchUnderseaCables = makeRefFetcher("undersea-cables.json");
export const fetchPipelines = makeRefFetcher("pipelines.json");
export const fetchTradeRoutes = makeRefFetcher("trade-routes.json");
export const fetchDatacenters = makeRefFetcher("datacenters.json");
export const fetchManufacturing = makeRefFetcher("manufacturing.json");
export const fetchStorageFacilities = makeRefFetcher("storage-facilities.json");
export const fetchMilitaryBases = makeRefFetcher("military-bases.json");
export const fetchSanctions = makeRefFetcher("sanctions.json");

// nuclear-warheads.json and tariffs.json are JSON arrays keyed by capital
// coordinates — convert to point features for rendering.
interface WarheadRow {
  country: string;
  capital_lat: number;
  capital_lon: number;
  total_warheads: number;
  deployed_warheads?: number;
  source_note?: string;
}

export async function fetchNuclearWarheads(ctx: FetchContext): Promise<LayerData> {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const rows = await getJSON<WarheadRow[]>(`${base}data/nuclear-warheads.json`, {
    signal: ctx.signal,
  });
  const feats = (rows ?? [])
    .filter((r) => Number.isFinite(r.capital_lat) && Number.isFinite(r.capital_lon))
    .map((r) =>
      point(r.capital_lon, r.capital_lat, {
        title: `${r.country} — ~${r.total_warheads} warheads`,
        country: r.country,
        total_warheads: r.total_warheads,
        deployed_warheads: r.deployed_warheads ?? null,
        source: r.source_note ?? "FAS/SIPRI estimate",
        kind: "Nuclear arsenal",
      })
    );
  return { geojson: fc(feats) };
}

interface TariffRow {
  country: string;
  capital_lat: number;
  capital_lon: number;
  tariff_summary?: string;
  example_rate?: string;
  source_note?: string;
}

export async function fetchTariffs(ctx: FetchContext): Promise<LayerData> {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const rows = await getJSON<TariffRow[]>(`${base}data/tariffs.json`, {
    signal: ctx.signal,
  });
  const feats = (rows ?? [])
    .filter((r) => Number.isFinite(r.capital_lat) && Number.isFinite(r.capital_lon))
    .map((r) =>
      point(r.capital_lon, r.capital_lat, {
        title: `${r.country} — US tariffs`,
        country: r.country,
        tariff_summary: r.tariff_summary ?? "",
        example_rate: r.example_rate ?? "",
        source: r.source_note ?? "",
        kind: "US tariff",
      })
    );
  return { geojson: fc(feats) };
}

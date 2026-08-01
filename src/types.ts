import type { FeatureCollection, Geometry } from "geojson";

/** A logical grouping of layers shown in the sidebar. */
export type LayerCategory =
  | "Conflict & Security"
  | "Maritime"
  | "Aerospace"
  | "Energy & Infrastructure"
  | "Cyber & Networks"
  | "Economy & Trade"
  | "Hazards & Health";

/** How a layer obtains its data. */
export type LayerKind = "live" | "reference";

/** Result of a layer's fetch: GeoJSON ready to render + optional status note. */
export interface LayerData {
  geojson: FeatureCollection<Geometry, Record<string, unknown>>;
  /** Honest note shown to the user (e.g. "needs API key", "rate limited"). */
  note?: string;
  /** Set true when the layer is empty because a required key is missing. */
  needsKey?: boolean;
}

/** How a layer should be drawn on the map. */
export type RenderStyle =
  | { type: "circle"; color: string; radius?: number }
  | { type: "icon"; color: string; symbol: string }
  | { type: "line"; color: string; width?: number }
  | { type: "heat"; color: string };

export interface LayerDefinition {
  id: string;
  label: string;
  category: LayerCategory;
  kind: LayerKind;
  /** Short description shown in the (i) tooltip. */
  description: string;
  /** Data provenance shown in tooltip + docs. */
  source: string;
  /** Documentation/source URL. */
  sourceUrl?: string;
  /** Rendering style. */
  style: RenderStyle;
  /** Refresh interval in ms for live layers (0 = fetch once). */
  refreshMs: number;
  /** Whether this layer needs an env key to be useful. */
  requiresKey?: string;
  /** The fetcher. Receives current map bounds for viewport-scoped APIs. */
  fetch: (ctx: FetchContext) => Promise<LayerData>;
  /** Field used as the popup title. */
  titleField?: string;
}

export interface FetchContext {
  /** Current map bounds [west, south, east, north]. */
  bounds: [number, number, number, number];
  signal: AbortSignal;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  lat?: number;
  lon?: number;
  domain?: string;
  category?: string;
}

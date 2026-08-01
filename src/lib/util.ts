import type { Feature, FeatureCollection, Geometry } from "geojson";

/** Build a GeoJSON FeatureCollection from rows. */
export function fc(
  features: Feature<Geometry, Record<string, unknown>>[]
): FeatureCollection<Geometry, Record<string, unknown>> {
  return { type: "FeatureCollection", features };
}

export function point(
  lon: number,
  lat: number,
  props: Record<string, unknown>
): Feature<Geometry, Record<string, unknown>> {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: props,
  };
}

/** Read a Vite env var safely. */
export function env(key: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (import.meta as any).env?.[key];
  return typeof v === "string" ? v.trim() : "";
}

/** Fetch JSON with timeout + abort support. Throws on non-2xx. */
export async function getJSON<T = unknown>(
  url: string,
  opts: { signal?: AbortSignal; headers?: Record<string, string>; timeoutMs?: number } = {}
): Promise<T> {
  const { signal, headers, timeoutMs = 20000 } = opts;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${shortUrl(url)}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export async function getText(
  url: string,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {}
): Promise<string> {
  const { signal, timeoutMs = 20000 } = opts;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${shortUrl(url)}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function shortUrl(u: string): string {
  try {
    return new URL(u).host;
  } catch {
    return u.slice(0, 40);
  }
}

/** Load a bundled reference dataset from /public/data. */
export async function loadReference(
  file: string,
  signal?: AbortSignal
): Promise<FeatureCollection<Geometry, Record<string, unknown>>> {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const data = await getJSON<FeatureCollection<Geometry, Record<string, unknown>>>(
    `${base}data/${file}`,
    { signal }
  );
  if (!data || data.type !== "FeatureCollection") {
    return { type: "FeatureCollection", features: [] };
  }
  return data;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function timeAgo(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

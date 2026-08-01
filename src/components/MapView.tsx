import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { GeoJSONSource, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LAYERS_BY_ID } from "../layers";
import type { FetchContext } from "../types";
import { useStore } from "../store";

// Dark raster basemap (CARTO, no token). Tiles load in the browser at runtime.
const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#05070d" } },
    { id: "carto", type: "raster", source: "carto" },
  ],
};

interface RunningLayer {
  timer?: number;
  abort?: AbortController;
}

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const running = useRef<Map<string, RunningLayer>>(new Map());
  const styleReady = useRef(false);

  // Subscribe to the active-layer set imperatively to avoid React re-renders.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: [10, 25],
      zoom: 1.6,
      maxZoom: 12,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    // Gate data layers on the STYLE being ready, not on `load`. `load` waits for
    // the first complete render, so a slow or blocked basemap tile host would
    // otherwise leave every data layer dormant and the map empty.
    const markReady = () => {
      if (styleReady.current) return;
      if (!map.isStyleLoaded()) return;
      styleReady.current = true;
      reconcile();
    };
    map.on("style.load", markReady);
    map.on("styledata", markReady);
    map.on("load", markReady);

    // Popup on click across all our data layers.
    map.on("click", (e) => {
      const ids = [...running.current.keys()].flatMap((id) => [
        `lyr-${id}`,
        `lyr-${id}-line`,
      ]);
      const present = ids.filter((id) => map.getLayer(id));
      if (present.length === 0) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: present });
      if (!feats.length) return;
      const p = feats[0].properties ?? {};
      const rows = Object.entries(p)
        .filter(([k]) => k !== "html")
        .map(
          ([k, v]) =>
            `<div class="pp-row"><span>${escapeHtml(k)}</span><b>${escapeHtml(
              String(v)
            )}</b></div>`
        )
        .join("");
      new maplibregl.Popup({ closeButton: true, maxWidth: "320px" })
        .setLngLat(e.lngLat)
        .setHTML(`<div class="pp">${rows}</div>`)
        .addTo(map);
    });

    map.on("moveend", () => refetchViewportLayers());

    return () => {
      running.current.forEach((r) => {
        if (r.timer) clearInterval(r.timer);
        r.abort?.abort();
      });
      running.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile whenever the active set changes.
  useEffect(() => {
    const unsub = useStore.subscribe(() => reconcile());
    reconcile();
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function bounds(): [number, number, number, number] {
    const map = mapRef.current!;
    const b = map.getBounds();
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  }

  async function runFetch(id: string) {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    const def = LAYERS_BY_ID[id];
    if (!def) return;
    const state = running.current.get(id);
    if (!state) return;
    state.abort?.abort();
    const abort = new AbortController();
    state.abort = abort;
    const setStatus = useStore.getState().setStatus;
    setStatus(id, { loading: true, error: undefined });
    const ctx: FetchContext = { bounds: bounds(), signal: abort.signal };
    try {
      const data = await def.fetch(ctx);
      if (abort.signal.aborted) return;
      upsertSource(id, data.geojson);
      setStatus(id, {
        loading: false,
        note: data.note,
        needsKey: data.needsKey,
        count: data.geojson.features.length,
        updatedAt: Date.now(),
      });
    } catch (err) {
      if (abort.signal.aborted) return;
      setStatus(id, {
        loading: false,
        error: err instanceof Error ? err.message : "fetch failed",
      });
    }
  }

  function upsertSource(id: string, geojson: GeoJSON.FeatureCollection) {
    const map = mapRef.current!;
    const srcId = `src-${id}`;
    const existing = map.getSource(srcId) as GeoJSONSource | undefined;
    if (existing) {
      existing.setData(geojson as any);
      return;
    }
    map.addSource(srcId, { type: "geojson", data: geojson as any });
    const def = LAYERS_BY_ID[id];
    if (def.style.type === "graduated") {
      const s = def.style;
      map.addLayer({
        id: `lyr-${id}`,
        type: "circle",
        source: srcId,
        paint: {
          "circle-color": [
            "interpolate",
            ["linear"],
            ["to-number", ["get", s.field], s.min],
            s.min,
            s.colorLow,
            s.max,
            s.colorHigh,
          ] as any,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["to-number", ["get", s.field], s.min],
            s.min,
            s.radiusMin ?? 4,
            s.max,
            s.radiusMax ?? 20,
          ] as any,
          "circle-opacity": 0.82,
          "circle-stroke-color": "#000",
          "circle-stroke-width": 0.6,
        },
      });
    } else if (def.style.type === "data") {
      const s = def.style;
      map.addLayer({
        id: `lyr-${id}`,
        type: "circle",
        source: srcId,
        paint: {
          "circle-color": ["coalesce", ["get", s.colorField], s.fallback] as any,
          "circle-radius": s.radius ?? 2.2,
          "circle-opacity": 0.85,
          "circle-stroke-color": "#000",
          "circle-stroke-width": 0.3,
        },
      });
    } else if (def.style.type === "line") {
      map.addLayer({
        id: `lyr-${id}-line`,
        type: "line",
        source: srcId,
        paint: {
          "line-color": def.style.color,
          "line-width": def.style.width ?? 1,
          "line-opacity": 0.7,
        },
      });
    } else {
      const color = def.style.type === "circle" ? def.style.color : "#ffffff";
      const radius = (def.style.type === "circle" && def.style.radius) || 4;
      map.addLayer({
        id: `lyr-${id}`,
        type: "circle",
        source: srcId,
        paint: {
          "circle-color": color,
          "circle-radius": radius,
          "circle-opacity": 0.85,
          "circle-stroke-color": "#000",
          "circle-stroke-width": 0.4,
        },
      });
    }
  }

  function removeLayer(id: string) {
    const map = mapRef.current!;
    for (const lid of [`lyr-${id}`, `lyr-${id}-line`]) {
      if (map.getLayer(lid)) map.removeLayer(lid);
    }
    const srcId = `src-${id}`;
    if (map.getSource(srcId)) map.removeSource(srcId);
  }

  function reconcile() {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    const active = useStore.getState().activeLayers;
    // Start newly active layers.
    for (const id of active) {
      if (running.current.has(id)) continue;
      const def = LAYERS_BY_ID[id];
      if (!def) continue;
      const rl: RunningLayer = {};
      running.current.set(id, rl);
      runFetch(id);
      if (def.refreshMs > 0) {
        rl.timer = window.setInterval(() => runFetch(id), def.refreshMs);
      }
    }
    // Stop deactivated layers.
    for (const id of [...running.current.keys()]) {
      if (active.has(id)) continue;
      const rl = running.current.get(id)!;
      if (rl.timer) clearInterval(rl.timer);
      rl.abort?.abort();
      running.current.delete(id);
      removeLayer(id);
    }
  }

  function refetchViewportLayers() {
    // Layers whose data depends on the viewport bounds.
    for (const id of ["flights-commercial", "flights-military", "vessels", "tankers"]) {
      if (running.current.has(id)) runFetch(id);
    }
  }

  return <div ref={containerRef} className="map-root" />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

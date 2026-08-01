# Architecture

WORLD PALANTIR is a client-side single-page app. All data fetching happens in the
**user's browser** — there is no backend. This keeps deployment trivial (static
hosting) and means every layer is driven by a real, live request at view time.

```
┌─────────────────────────────────────────────────────────────┐
│  App.tsx  (topbar · layout)                                   │
│  ├── Sidebar.tsx      layer filters, grouped by category      │
│  ├── NewsPanel.tsx    multi-source live news feed (GDELT)     │
│  └── MapView.tsx      MapLibre map + the "layer engine"       │
│                                                               │
│  store.ts (Zustand)   active layers + per-layer status        │
│                                                               │
│  layers.ts            the LAYERS registry — one definition    │
│                       per toggle, binding label/style/source  │
│                       to a fetch() function                   │
│                                                               │
│  lib/sources/*        the real data adapters                  │
│   ├── flights.ts      OpenSky ADS-B                           │
│   ├── satellites.ts   CelesTrak TLE + SGP4 (satellite.js)     │
│   ├── gdelt.ts        GDELT GEO + DOC (events & news)         │
│   ├── ais.ts          aisstream.io WebSocket (vessels)        │
│   ├── misc.ts         USGS quakes, GPSJam interference        │
│   └── reference.ts    curated GeoJSON from /public/data       │
└─────────────────────────────────────────────────────────────┘
```

## The layer model

Every map layer is a `LayerDefinition` (`src/types.ts`):

```ts
interface LayerDefinition {
  id; label; category; kind;          // metadata
  description; source; sourceUrl;     // provenance shown in UI + docs
  style;                              // how to draw (circle | line)
  refreshMs;                          // live polling interval (0 = once)
  requiresKey?;                       // env var gating the layer
  fetch(ctx): Promise<LayerData>;     // returns GeoJSON + status note
}
```

`fetch` receives a `FetchContext` containing the current map `bounds` (for
viewport-scoped APIs like OpenSky/AIS) and an `AbortSignal`.

## The layer engine (`MapView.tsx`)

The map holds an imperative engine that **reconciles** the MapLibre style against
the set of active layers in the store:

1. **Activate** — when a layer is switched on, the engine creates a GeoJSON source
   + render layer, runs `fetch()` immediately, and (for live layers) sets a polling
   interval at `refreshMs`.
2. **Update** — each fetch calls `source.setData(...)` with fresh GeoJSON and
   records `{count, note, error, needsKey, updatedAt}` in the store so the sidebar
   can show live status (`…`, `⚠`, `🔑`, or a feature count).
3. **Deactivate** — switching a layer off clears its timer, aborts in-flight
   requests, and removes the source + layer.
4. **Viewport refetch** — on `moveend`, viewport-scoped layers (flights, vessels)
   refetch for the new bounds.

This avoids React re-rendering the map on every data tick — React owns the chrome
(sidebar, news, topbar); the engine owns the canvas.

## Live vs. reference layers

- **`kind: "live"`** — fetched fresh from a public API on a timer. Examples:
  flights, satellites (positions propagated client-side from TLEs at the current
  instant), GDELT events, USGS quakes, AIS vessels.
- **`kind: "reference"`** — authoritative published datasets bundled in
  `public/data/*.json` (chokepoints, cables, pipelines, nuclear sites, arsenals,
  spaceports, datacenters, …). These are real-world facts, not simulations. See
  `DATA_SOURCES.md`.

## Satellites: real orbital mechanics

`satellites.ts` downloads Two-Line Element sets from CelesTrak and runs the SGP4
propagator (`satellite.js`) to compute each satellite's sub-point (lat/lon/alt)
**for the current time** on every refresh. So the dots on the map are the real,
live ground positions of those objects — not pre-baked tracks.

## Network reality

Third-party APIs are called directly from the browser, so they must allow CORS
(OpenSky, GDELT, USGS, CelesTrak, GPSJam, aisstream all do). If you self-host
behind a strict CSP, allowlist those origins. The optional key-gated providers
(Cloudflare Radar, abuse.ch, ACLED) may require a lightweight proxy in some
deployments — documented in `SETUP.md`.

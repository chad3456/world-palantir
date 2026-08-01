# Setup, deployment & troubleshooting

## Prerequisites

- Node.js 18+ and npm.

## Local development

```bash
npm install
cp .env.example .env       # optional
npm run dev                # http://localhost:5173
```

Vite hot-reloads on save. The map fetches live data immediately for the default
active layers (conflict zones, commercial aviation, earthquakes).

## Environment variables

All keys are **optional**; the app is fully functional without them. Vite only
exposes variables prefixed `VITE_`. After editing `.env`, restart `npm run dev`.

```ini
VITE_AISSTREAM_KEY=            # maritime vessels / oil tankers (aisstream.io)
VITE_OPENSKY_USER=             # higher OpenSky flight rate limit
VITE_OPENSKY_PASS=
VITE_CLOUDFLARE_RADAR_TOKEN=   # internet-outage enrichment
VITE_ABUSECH_KEY=              # cyber IOC enrichment
VITE_ACLED_KEY=                # conflict-event enrichment
VITE_ACLED_EMAIL=
```

### Getting the AIS key (maritime layers)

1. Register free at <https://aisstream.io>.
2. Create an API key.
3. Put it in `.env` as `VITE_AISSTREAM_KEY=...` and restart.
4. Toggle **Maritime vessels** — vessels appear as position reports stream in
   (zoom to a busy area like the English Channel or Singapore Strait for density).

Without the key the maritime layers show: *"Set VITE_AISSTREAM_KEY … to stream live
AIS vessels."* — they never display fake ships.

## CORS & the API proxy (important)

Two upstream APIs — **GDELT** (news, conflicts, war, protests, cyber, outages,
disease) and **OpenSky** (flights) — do not send CORS headers, so a browser
cannot call them directly (you'd see `Failed to fetch`). The app handles this:

- **`npm run dev` and `npm run preview`** — a same-origin proxy is built into the
  Vite config (`/api-gdelt`, `/api-opensky`, …). **No setup needed**; everything
  works out of the box locally.
- **Static production deploy** — set `VITE_CORS_PROXY` in `.env` to a CORS proxy
  prefix that accepts the target URL, e.g. `https://my-proxy.example/?url=`. Only
  the CORS-blocked hosts are routed through it; CelesTrak/USGS (which support CORS)
  always go direct. A 10-line Cloudflare Worker or Vercel edge function is enough.

CelesTrak, USGS, GitHub (reference data) and the aisstream.io WebSocket all work
without any proxy.

## Production build & deploy

```bash
npm run build       # outputs static site to dist/
npm run preview     # serve dist/ locally to verify
```

`dist/` is a static bundle — deploy anywhere:

- **GitHub Pages** — set Vite `base` to `/<repo>/` if not served from root, then
  publish `dist/`.
- **Netlify / Vercel / Cloudflare Pages** — build command `npm run build`,
  publish directory `dist`.

> If deploying under a sub-path, set `base` in `vite.config.ts`; the reference
> datasets are loaded via `import.meta.env.BASE_URL` so they follow the base path.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| A live layer shows `⚠` | Provider rate-limited or temporarily down. OpenSky and GDELT throttle anonymous traffic — wait, or add an OpenSky account. |
| Flights empty when zoomed out | OpenSky bounding-box queries return little at world scale; zoom into a region. |
| Maritime layer shows `🔑` | Missing `VITE_AISSTREAM_KEY`. |
| No basemap tiles | The CARTO tile host is blocked by your network/CSP. Allowlist `*.basemaps.cartocdn.com` or swap the tile URL in `MapView.tsx`. |
| Satellites take a moment | First load downloads TLE catalogues from CelesTrak; cached 30 min thereafter. |
| CORS error in console for an enrichment key | Cloudflare Radar / abuse.ch may need a small proxy; the default GDELT-based layers need none. |

## Adding a new layer

1. Write a fetcher in `src/lib/sources/` returning `Promise<LayerData>`.
2. Add a `LayerDefinition` to `src/layers.ts` (id, category, style, refresh, fetch).
3. Done — it appears in the sidebar automatically, grouped by its category.

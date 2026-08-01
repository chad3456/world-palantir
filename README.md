# 🌐 WORLD PALANTIR — Global OSINT Monitor

A real-time, open-source-intelligence situational-awareness dashboard. It overlays
**live** military, geopolitical, energy, maritime, aerospace, cyber and hazard data
onto a single dark-themed world map — inspired by platforms like
[worldmonitor.app](https://www.worldmonitor.app) and
[monitor-the-situation.com](https://monitor-the-situation.com).

> **No simulated data.** Every layer is wired to a real source. Live layers fetch
> directly from public APIs in your browser; reference layers ship authoritative
> published datasets (facility locations, cable routes, arsenal estimates).
> Key-gated layers show an honest empty state until you add a free API key —
> they never display fabricated tracks.

---

## ✨ What it shows

Layers are grouped into categories in the left sidebar. Toggle any combination.

| Category | Layers |
|---|---|
| **Conflict & Security** | Conflict zones · Current war-zone monitor · Protests & civil unrest · Military bases · Nuclear sites · Nuclear warheads (by state) · Sanctions imposed |
| **Maritime** | Maritime vessels / ship traffic · Oil tankers (live) · Maritime chokepoints · Trade routes · Undersea cables |
| **Aerospace** | Commercial aviation · Military aviation · Space stations · Military / recon satellites · Navigation satellites (GNSS) · Starlink constellation · Spaceports |
| **Energy & Infrastructure** | Oil & gas pipelines · Storage facilities · AI / hyperscale datacenters · Manufacturing units |
| **Cyber & Networks** | Cyber threats · GPS jamming / spoofing · Internet outages / disruption |
| **Influence & Info-War** | Info-War / PsyOps index (composite, per country) |
| **Economy & Trade** | US tariffs (by country) |
| **Hazards & Health** | Earthquakes (24h) · Disease outbreaks |

Plus a **live multi-source news feed** (Top / Conflict / Energy / Cyber / Economy)
aggregating thousands of outlets worldwide via GDELT.

---

## 🚀 Quick start

```bash
npm install
cp .env.example .env      # optional — add keys to unlock key-gated layers
npm run dev               # http://localhost:5173
```

Build for production:

```bash
npm run build && npm run preview
```

The app is a static SPA (Vite + React + MapLibre GL) — deploy `dist/` to any static
host (GitHub Pages, Netlify, Vercel, Cloudflare Pages).

---

## 🔑 API keys (all optional, all free)

Most layers work with **zero configuration**. A few stream from key-gated providers.
Copy `.env.example` → `.env` and fill in what you want:

| Layer(s) | Variable | Where to get it |
|---|---|---|
| Maritime vessels / oil tankers | `VITE_AISSTREAM_KEY` | [aisstream.io](https://aisstream.io) (free) |
| Flights (higher rate limit) | `VITE_OPENSKY_USER` / `VITE_OPENSKY_PASS` | [opensky-network.org](https://opensky-network.org) (free) |
| Internet outages (enrichment) | `VITE_CLOUDFLARE_RADAR_TOKEN` | [Cloudflare Radar](https://dash.cloudflare.com) (free) |
| Cyber IOCs (enrichment) | `VITE_ABUSECH_KEY` | [abuse.ch](https://auth.abuse.ch) (free) |
| Conflict events (enrichment) | `VITE_ACLED_KEY` / `VITE_ACLED_EMAIL` | [acleddata.com](https://acleddata.com) (free) |

Without `VITE_AISSTREAM_KEY` the maritime layers render an empty state with a note —
**never fake ships**.

---

## 📚 Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the app is structured.
- [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) — provenance & licence of every layer.
- [`docs/PSYOPS_INDEX.md`](docs/PSYOPS_INDEX.md) — the Info-War index methodology.
- [`docs/SETUP.md`](docs/SETUP.md) — local dev, keys, deployment, troubleshooting.
- [`docs/AGENTS.md`](docs/AGENTS.md) — how data was aggregated with agents.

---

## ⚖️ Data & licensing notes

This project aggregates **publicly available** OSINT. Live feeds are subject to each
provider's terms and rate limits. Reference datasets are documented public facts
(facility locations, published arsenal estimates) — see `docs/DATA_SOURCES.md` for
exact provenance and caveats. Figures such as nuclear-warhead counts and US tariffs
change over time; treat them as dated estimates and verify against the cited source.

Built with MapLibre GL, React, Vite and satellite.js. Basemap © OpenStreetMap © CARTO.

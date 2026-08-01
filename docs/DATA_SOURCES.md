# Data sources & provenance

Every layer and its real source. **Nothing here is simulated.** Live layers hit the
listed API at runtime; reference layers ship the listed dataset in `public/data/`.
Where a figure is a dated estimate (arsenals, tariffs) that is stated explicitly.

## Live layers (fetched in-browser)

| Layer | Source | Endpoint / method | Refresh | Key |
|---|---|---|---|---|
| Conflict zones | GDELT 2.0 GEO | `api.gdeltproject.org/api/v2/geo/geo` (geojson) | 10 min | — |
| Current war-zone monitor | GDELT 2.0 GEO | GEO query, 24h window | 8 min | — |
| Protests & civil unrest | GDELT 2.0 GEO | GEO query, 48h window | 12 min | — |
| Cyber threats | GDELT 2.0 GEO | GEO query | 12 min | — |
| Internet outages | GDELT 2.0 GEO | GEO query | 15 min | — |
| Disease outbreaks | GDELT 2.0 GEO | GEO query | 20 min | — |
| Commercial aviation | OpenSky Network | `/api/states/all` (viewport bbox) | 20 s | optional |
| Military aviation | OpenSky Network | `/api/states/all` + callsign filter | 20 s | optional |
| Space stations | CelesTrak + SGP4 | GP `GROUP=stations` TLE, propagated | 20 s | — |
| Military / recon satellites | CelesTrak + SGP4 | GP `GROUP=military` TLE | 30 s | — |
| Navigation satellites (GNSS) | CelesTrak + SGP4 | GP `GROUP=gnss` TLE | 30 s | — |
| Private satellites (all operators) | CelesTrak + SGP4 | 12 operator groups, merged & colour-coded | 30 s | — |
| Per-operator layers (Starlink, OneWeb, Kuiper, Qianfan, Planet, Spire, Iridium NEXT, Globalstar, ORBCOMM, Intelsat, SES, Swarm) | CelesTrak + SGP4 | GP `GROUP=<operator>` TLE | 30 s | — |
| Maritime vessels / ship traffic | aisstream.io | WebSocket `PositionReport` (viewport bbox) | stream | **required** |
| Oil tankers (live) | aisstream.io | WebSocket, AIS ship-type 80–89 | stream | **required** |
| GPS jamming / spoofing | GPSJam.org | daily aggregated GeoJSON | 30 min | — |
| Earthquakes (24h) | USGS | `summary/2.5_day.geojson` | 5 min | — |
| Live news feed | GDELT 2.0 DOC | `/api/v2/doc/doc` artlist | 5 min | — |

### Notes on classification

- **Military aircraft** are identified by a curated list of NATO/allied military
  callsign prefixes (RCH/REACH, RRR, ASCOT, FORTE, …). This is a heuristic — it
  catches transponding military flights using known callsigns, not aircraft that
  are dark or spoofing.
- **Military / recon satellites** use CelesTrak's `military` group (catalogued
  objects). Classified payloads that are not catalogued cannot be shown.
- **Commercial constellations** are never given hard-coded sizes — the count next
  to each layer is whatever the catalogue returns at that moment, because these
  fleets change weekly. Two group identifiers are unconfirmed and fail closed;
  see `SATELLITE_OPERATORS.md` for the registry and its verification status.
- **Cyber / outages / disease / GPS-jamming reports** from GDELT are *news-event*
  geolocations — i.e. where the reporting places the event. GPS jamming also has a
  dedicated **measured** layer from GPSJam (aggregated aircraft navigation
  integrity), which is sensor-derived rather than news-derived.

## Reference layers (`public/data/`)

| File | Count | Geometry | Provenance |
|---|---|---|---|
| `chokepoints.json` | 12 | Point | Hand-curated; oil-transit volumes from US EIA estimates |
| `spaceports.json` | 30 | Point | Hand-curated public launch-site locations |
| `nuclear-sites.json` | 40 | Point | Hand-curated (IAEA/FAS/public records) |
| `nuclear-warheads.json` | 9 | array | **FAS/SIPRI 2024 estimates** (dated) |
| `undersea-cables.json` | 650 | MultiLineString | TeleGeography submarine-cable data (GeoJSON mirror) |
| `pipelines.json` | 20 | LineString | Hand-curated; endpoints accurate, routing simplified |
| `trade-routes.json` | 8 | LineString | Hand-curated major shipping lanes |
| `datacenters.json` | 30 | Point | Hand-curated AI/hyperscale campuses |
| `manufacturing.json` | 25 | Point | Hand-curated strategic plants (semis/auto) |
| `storage-facilities.json` | 20 | Point | Hand-curated SPR / oil-storage hubs |
| `military-bases.json` | 30 | Point | Hand-curated strategic bases |
| `sanctions.json` | 11 | Point | Hand-curated (OFAC/UN/EU programmes) |
| `tariffs.json` | 12 | array | **US tariffs as reported 2025** (dated; verify current) |

### Caveats (read these)

- **Arsenal counts** (`nuclear-warheads.json`) are published *estimates* from the
  Federation of American Scientists / SIPRI nuclear notebooks, 2024. Real
  inventories are classified.
- **Pipeline & trade-route geometries** are simplified polylines: terminals are
  real, intermediate vertices are approximate routing — not surveyed rights-of-way.
- **Tariffs** shifted repeatedly through 2025 (escalations, deals, truces). Entries
  describe baselines/ranges and carry an "as reported 2025; verify current" note.
- **Undersea cables** were sourced from a GeoJSON mirror of TeleGeography's
  submarine-cable map; the legacy upstream repo path no longer resolves. Geometry
  is full route lines with cable names.

## Optional enrichment sources (key-gated, documented but off by default)

| Source | Purpose | Why optional |
|---|---|---|
| Cloudflare Radar | precise internet-outage annotations | requires token; browser-CORS varies |
| abuse.ch ThreatFox/URLhaus | live malicious IOCs | requires Auth-Key; IOCs need IP-geo to map |
| ACLED | curated armed-conflict events | requires free research key |

These are wired via `.env` variables; the default conflict/outage/cyber layers use
GDELT so the map is fully functional with **no keys at all**.

## Licensing

| Source | Terms |
|---|---|
| OpenSky Network | Free for non-commercial; rate-limited |
| CelesTrak | Public domain orbital data |
| GDELT | Open, free API |
| USGS | Public domain |
| GPSJam | Open data, attribution requested |
| aisstream.io | Free tier with API key |
| TeleGeography cable data | Attribution to TeleGeography |
| Basemap | © OpenStreetMap contributors © CARTO |

# Data aggregation with agents

This project was assembled with an agent-assisted workflow, as requested. Live data
is fetched at runtime; the **reference datasets** were aggregated by a curation agent.

## What the curation agent did

A `general-purpose` agent was tasked with producing the real reference datasets in
`public/data/`. Its instructions were strict:

- **Never invent or simulate coordinates or figures.**
- Prefer fetching authoritative open datasets (it pulled the 650-feature submarine
  cable network from a TeleGeography GeoJSON mirror on GitHub).
- For curated sets, use documented public locations of well-known facilities.
- State estimates as estimates and cite provenance.
- Validate every file as parseable JSON / valid GeoJSON before finishing.

It produced 12 datasets (chokepoints, spaceports, nuclear sites, nuclear arsenals,
undersea cables, pipelines, trade routes, datacenters, manufacturing, storage,
military bases, tariffs) and reported per-file provenance and honesty caveats,
which are reflected in `DATA_SOURCES.md`.

## Why the live layers are not "agent-fetched" snapshots

Live layers (flights, satellites, ships, conflicts, quakes, news) deliberately call
their APIs **from the browser at view time** rather than being baked into the repo.
That guarantees the data is current every time the dashboard is opened — an agent
snapshot would be stale the moment it was committed.

## Reproducing / refreshing reference data

To refresh a reference dataset, re-run a curation pass and overwrite the relevant
file in `public/data/`, keeping the documented schema:

- GeoJSON layers: `FeatureCollection` of `Point`/`LineString`/`MultiLineString`
  with a `title` (or `name`) property.
- `nuclear-warheads.json` / `tariffs.json`: JSON arrays keyed by
  `capital_lat` / `capital_lon`.

See `src/lib/sources/reference.ts` for exactly how each file is consumed.

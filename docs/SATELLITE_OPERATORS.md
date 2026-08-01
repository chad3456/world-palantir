# Private / commercial satellite operators

The **Commercial Space** category tracks privately-operated constellations using
live public catalogue data. Positions are real: TLEs are downloaded from
CelesTrak and propagated to the current instant with SGP4 in the browser.

## Why there are no satellite counts in this file

Constellation sizes change weekly — Starlink alone launches dozens of satellites
a month, and older craft deorbit continuously. Any count written here would be
wrong within days. **The number shown next to each layer is whatever the
catalogue currently returns**, which is the only count that can be trusted. The
registry below therefore carries stable facts (operator, country, purpose, orbit)
and leaves the arithmetic to the live feed.

## Registry

Defined in `src/lib/sources/commercial-sats.ts` (single source of truth — the
layer list is generated from it, so adding an entry adds a map layer).

| Operator | Company | Country | Purpose | Orbit | CelesTrak `GROUP=` | ID confirmed |
|---|---|---|---|---|---|---|
| Starlink | SpaceX | United States | Broadband internet | LEO | `starlink` | ✅ |
| OneWeb | Eutelsat OneWeb | UK / France | Broadband internet | LEO | `oneweb` | ✅ |
| Amazon Leo (Kuiper) | Amazon | United States | Broadband internet | LEO | `kuiper` | ✅ |
| Qianfan / Thousand Sails | Shanghai Spacecom (SSST) | China | Broadband internet | LEO | `qianfan` | ✅ |
| Planet Labs | Planet Labs PBC | United States | Earth imaging | LEO | `planet` | ✅ |
| Spire Global | Spire Global | United States | Weather, AIS & ADS-B sensing | LEO | `spire` | ✅ |
| Iridium NEXT | Iridium Communications | United States | Voice, data & IoT | LEO | `iridium-NEXT` | ✅ |
| Globalstar | Globalstar | United States | Satphone & IoT | LEO | `globalstar` | ✅ |
| ORBCOMM | ORBCOMM | United States | IoT / M2M messaging | LEO | `orbcomm` | ✅ |
| Intelsat | Intelsat (SES group) | Luxembourg / US | GEO communications | GEO | `intelsat` | ✅ |
| SES | SES S.A. | Luxembourg | GEO & MEO comms (incl. O3b) | mixed | `ses` | ⚠️ unconfirmed |
| Swarm | Swarm Technologies (SpaceX) | United States | Low-bandwidth IoT | LEO | `swarm` | ⚠️ unconfirmed |

**"ID confirmed"** records whether the CelesTrak `GROUP=` identifier was verified
against public documentation. The two unconfirmed entries **fail closed**: if the
group does not exist, the layer reports "unconfirmed and returned nothing" rather
than displaying anything invented. Confirm them by opening the layer's source URL
from the sidebar `i` tooltip; if a name is wrong, correct `group` in the registry.

## Layers produced

- **Private satellites (all operators)** — every constellation at once, coloured
  per operator. Operators that fail to load are named in the status note, so a
  partial result is never silently presented as complete.
- **One layer per operator** — generated from the registry.

## Notable context

- **Spire** is doubly relevant to this dashboard: its LEMUR cubesats collect the
  maritime AIS and aviation ADS-B data that feed the ship and flight layers.
- **Starlink** was moved out of *Aerospace* into *Commercial Space* so it carries
  operator metadata alongside its peers rather than sitting on its own.
- **Amazon Leo** is the 2025 rebrand of Project Kuiper; deployment is ongoing, so
  its catalogue is small relative to its licensed constellation size.
- **Swarm** service is being wound down by SpaceX; expect a shrinking catalogue.
- Commercial operators also fly **government payloads** (e.g. imagery contracts),
  and some constellations are hosted or dual-use. Operator ≠ sole customer.

## Engineering notes

`src/lib/sources/tle.ts` holds the shared loader:

- TLE sets are cached for **30 minutes**; positions are recomputed from cache on
  every refresh (default 30 s), so refreshes are cheap and stay current.
- A group that errors is marked failed and not retried for 30 minutes, so a bad
  or unknown identifier cannot hammer CelesTrak.
- Unknown groups are detected by response shape (HTML/short body) as well as HTTP
  status, because CelesTrak answers some bad queries with a text notice.

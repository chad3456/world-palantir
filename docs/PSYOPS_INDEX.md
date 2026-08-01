# Information-Warfare / PsyOps Index — methodology

There is **no official "PsyOps index"** of nations. This layer computes an **open,
reproducible composite** from real, published inputs plus a live news-aggregation
signal. It is an analytical estimate, not an authoritative score — read the caveats.

## Formula

For each country, a 0–100 index:

```
index = 0.40·capacity + 0.25·infoControl + 0.10·foreignOps + 0.25·liveActivity
```

If the live signal is unavailable on a given refresh, its weight is dropped and the
remaining three weights are renormalised (so the map still shows the capability
baseline).

## Inputs

| Component | Weight | Source | Meaning |
|---|---|---|---|
| `capacity` | 0.40 | **Oxford Internet Institute** — *Industrialized Disinformation* cyber-troops inventory (2020/2021) | Organised state capacity for social-media manipulation, mapped high=100 / medium=66 / low=33 / minimal=15 / none=0. |
| `infoControl` | 0.25 | **Freedom House** — *Freedom on the Net* (latest) | `100 − FreedomOnNet`. Lower internet freedom ⇒ higher state information control. |
| `foreignOps` | 0.10 | Oxford report + documented attributions | 100 if the state is documented running influence operations targeting **foreign** audiences, else 0. |
| `liveActivity` | 0.25 | **GDELT 2.0** (live) | Volume of disinformation / propaganda / influence-operation reporting geolocated to the country over the last 7 days, normalised 0–100 across all countries each refresh. |

The first three are the **capability baseline** (`public/data/psyops-baseline.json`,
refreshed by re-curation). The fourth is **live**, aggregated in-browser from GDELT
on each layer refresh (every 30 min) — this is the "real-time" component.

## How the live aggregation works

`src/lib/sources/psyops.ts` queries the GDELT GEO API for an information-warfare
term set, then attributes each geolocated report to a country by parsing the
trailing country in the location name, summing counts per country, and normalising
against the busiest country that window. Countries with no live matches keep their
baseline (live sub-score 0).

## Caveats (important — do not over-read this)

- **Annual baselines.** Oxford and Freedom House publish periodically; the baseline
  reflects their latest editions, not today.
- **Capability ≠ intent ≠ effect.** A high index means documented capacity and/or
  high reporting volume — not proof of an active campaign right now.
- **Reporting bias.** GDELT skews to English-language, online news. Open societies
  with a free press generate *more* reporting about disinformation, which can push
  their live sub-score up even when they are the *target*, not the perpetrator. The
  capability baseline counterbalances this, but the bias is real.
- **Attribution is coarse.** Live country attribution is by location-name parsing,
  not actor attribution.
- **Missing data.** Countries the sources did not assess have `null` inputs and a
  reduced, baseline-only index; they are documented in the dataset `notes`.

## Reproducing / refreshing

Update `public/data/psyops-baseline.json` from the latest Oxford and Freedom House
editions (schema in `src/lib/sources/psyops.ts`). The live component needs no
maintenance. Adjust `WEIGHTS` in `psyops.ts` to retune the composite — keep this
doc in sync if you do.

## Sources

- Oxford Internet Institute / Programme on Democracy & Technology —
  *Industrialized Disinformation: 2020 Global Inventory of Organized Social Media
  Manipulation.* <https://demtech.oii.ox.ac.uk/>
- Freedom House — *Freedom on the Net.* <https://freedomhouse.org/report/freedom-net>
- GDELT Project 2.0 GEO API. <https://www.gdeltproject.org/>

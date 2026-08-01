# Strategic Atlas — self-contained artifact

A published, shareable build of the **fixed / reference half** of World Palantir.

**Live:** https://claude.ai/code/artifact/399a1549-ca21-4a4e-89a4-1e339e47979a

## Why this exists (and what it deliberately omits)

A published artifact runs under a strict CSP with **no outbound network access** —
no map tiles, no CDN scripts, no API calls. So this build:

- renders the world from **embedded Natural Earth 110m** geometry on canvas
  (no tile server), and
- embeds the **real curated datasets** from `public/data/`.

It therefore **cannot** show the live feeds — flights, satellites, AIS vessels,
GDELT events/news, and the Info-War index's fourth (live) term. Those require the
full application (`npm run dev`). The index shown here is the **baseline-only**
composite, renormalised over its three published inputs:

```
index = (0.40·capacity + 0.25·infoControl + 0.10·foreignOps) / 0.75
```

## Files

| File | Purpose |
|---|---|
| `pack.py` | Packs `public/data/*.json` + Natural Earth into a compact JS blob |
| `atlas_shell.html` | Page shell (CSS/markup/canvas engine) with a `/*__DATA__*/` marker |
| `atlas.html` | Built output — shell + spliced data (this is what gets published) |

## Rebuild

```bash
# fetch geometry once
curl -o ne_countries.geojson \
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
python3 artifact/pack.py                       # -> data.js
python3 - <<'PY'
shell=open('artifact/atlas_shell.html').read(); data=open('data.js').read()
open('artifact/atlas.html','w').write(shell.replace('/*__DATA__*/',data))
PY
```

Republish `artifact/atlas.html` to the same URL to update it in place.

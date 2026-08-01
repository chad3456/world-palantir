#!/usr/bin/env python3
"""Pack real OSINT datasets + Natural Earth geometry into one JS blob for the artifact."""
import json, os

SCRATCH = "/tmp/claude-0/-home-user-world-palantir/f0d7d7c6-673d-576e-8142-7b9b2765283d/scratchpad"
DATA = "/home/user/world-palantir/public/data"

def rnd(v, p=2):
    return round(float(v), p)

def clean_ring(ring, p=2, min_pts=4):
    out = []
    last = None
    for c in ring:
        pt = [rnd(c[0], p), rnd(c[1], p)]
        if pt != last:
            out.append(pt)
            last = pt
    return out if len(out) >= min_pts else None

def ring_bbox_area(ring):
    xs = [c[0] for c in ring]; ys = [c[1] for c in ring]
    return (max(xs) - min(xs)) * (max(ys) - min(ys))

# ── countries ────────────────────────────────────────────────────────────────
ne = json.load(open(f"{SCRATCH}/ne_countries.geojson"))
countries = []
for f in ne["features"]:
    g = f["geometry"]; polys = []
    raw = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    for poly in raw:
        outer = clean_ring(poly[0])
        if not outer or ring_bbox_area(outer) < 0.35:  # drop specks
            continue
        polys.append(outer)
    if polys:
        countries.append({"n": f["properties"].get("NAME", ""), "p": polys})

# ── helpers for our layers ───────────────────────────────────────────────────
def load(name):
    with open(f"{DATA}/{name}") as fh:
        return json.load(fh)

def points(name, title_keys=("title", "name"), extra=()):
    fc = load(name); out = []
    for f in fc["features"]:
        if f["geometry"]["type"] != "Point":
            continue
        c = f["geometry"]["coordinates"]; pr = f["properties"]
        t = next((pr[k] for k in title_keys if pr.get(k)), "")
        rec = {"c": [rnd(c[0], 3), rnd(c[1], 3)], "t": t}
        d = {k: pr[k] for k in extra if pr.get(k) not in (None, "")}
        if d:
            rec["d"] = d
        out.append(rec)
    return out

def lines(name, decimate=1, p=2):
    fc = load(name); out = []
    for f in fc["features"]:
        g = f["geometry"]; pr = f["properties"]
        t = pr.get("name") or pr.get("title") or ""
        segs = g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]
        cl = []
        for seg in segs:
            s = seg[::decimate] if decimate > 1 and len(seg) > 12 else seg
            r = clean_ring(s, p, min_pts=2)
            if r:
                cl.append(r)
        if cl:
            rec = {"t": t, "s": cl}
            if pr.get("type"):
                rec["d"] = {"type": pr["type"]}
            out.append(rec)
    return out

layers = {
  "chokepoints": points("chokepoints.json", extra=("type","daily_oil_transit_mbd","significance")),
  "spaceports": points("spaceports.json", extra=("country","operator","status")),
  "nuclear": points("nuclear-sites.json", extra=("country","type","status")),
  "bases": points("military-bases.json", extra=("country_operator","type","host_country")),
  "datacenters": points("datacenters.json", extra=("operator","country","focus")),
  "manufacturing": points("manufacturing.json", extra=("company","sector","country")),
  "storage": points("storage-facilities.json", extra=("type","capacity_note","country")),
  "sanctions": points("sanctions.json", extra=("country","programs","source")),
  "cables": lines("undersea-cables.json", decimate=3, p=2),
  "pipelines": lines("pipelines.json", p=2),
  "routes": lines("trade-routes.json", p=2),
}

# warheads + tariffs (arrays keyed by capital coords)
wh = json.load(open(f"{DATA}/nuclear-warheads.json"))
layers["warheads"] = [{
    "c": [rnd(r["capital_lon"],3), rnd(r["capital_lat"],3)],
    "t": r["country"],
    "d": {"total warheads": r["total_warheads"],
          "deployed": r.get("deployed_warheads"),
          "source": r.get("source_note","")}
} for r in wh]

tf = json.load(open(f"{DATA}/tariffs.json"))
layers["tariffs"] = [{
    "c": [rnd(r["capital_lon"],3), rnd(r["capital_lat"],3)],
    "t": r["country"],
    "d": {"rate": r.get("example_rate",""), "summary": r.get("tariff_summary",""),
          "note": r.get("source_note","")}
} for r in tf]

# ── psyops index (compute baseline-only index exactly as the app does) ───────
CAP = {"high":100,"medium":66,"low":33,"minimal":15,"none":0}
W = {"capacity":0.40,"infoControl":0.25,"foreignOps":0.10}
S = sum(W.values())
psy = []
for r in json.load(open(f"{DATA}/psyops-baseline.json")):
    cap_rating = r.get("cyber_troop_capacity")
    cap = CAP.get(cap_rating, 0)
    fotn = r.get("freedom_on_net")
    ic = (100 - fotn) if fotn is not None else 50
    fo = 100 if r.get("foreign_influence_ops") else 0
    idx = round((W["capacity"]*cap + W["infoControl"]*ic + W["foreignOps"]*fo) / S)
    psy.append({
        "c": [rnd(r["lon"],3), rnd(r["lat"],3)],
        "t": r["country"],
        "i": idx,
        "cap": cap_rating,
        "fotn": fotn,
        "fo": bool(r.get("foreign_influence_ops")),
        "note": r.get("notes",""),
        "src": r.get("sources",""),
    })
psy.sort(key=lambda x: -x["i"])
for n, rec in enumerate(psy, 1):
    rec["r"] = n
layers["psyops"] = psy

blob = {"countries": countries, "layers": layers}
out = f"{SCRATCH}/data.js"
with open(out, "w") as fh:
    fh.write("const DATA=")
    json.dump(blob, fh, separators=(",", ":"), ensure_ascii=False)
    fh.write(";")

print("countries:", len(countries), "rings:", sum(len(c["p"]) for c in countries))
for k, v in layers.items():
    print(f"  {k}: {len(v)}")
print("bytes:", os.path.getsize(out))
print("psyops top5:", [(p["t"], p["i"]) for p in psy[:5]])

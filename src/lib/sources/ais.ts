import type { FetchContext, LayerData } from "../../types";
import { env, fc, point } from "../util";

// aisstream.io — free real-time AIS vessel positions over WebSocket.
// Requires a free API key (VITE_AISSTREAM_KEY). Without it the maritime layers
// show an honest empty state — never simulated tracks.
// Docs: https://aisstream.io/documentation

interface Vessel {
  mmsi: number;
  name: string;
  lat: number;
  lon: number;
  sog?: number; // speed over ground (knots)
  cog?: number; // course over ground
  type?: number; // AIS ship type code
  ts: number;
}

class AisManager {
  private ws: WebSocket | null = null;
  private vessels = new Map<number, Vessel>();
  private bounds: [number, number, number, number] = [-180, -85, 180, 85];
  private connecting = false;
  private lastConnectAttempt = 0;

  get available(): boolean {
    return !!env("VITE_AISSTREAM_KEY");
  }

  setBounds(b: [number, number, number, number]) {
    // Reconnect only if the box moved meaningfully.
    const [w, s, e, n] = b;
    const [ow, os, oe, on] = this.bounds;
    const moved =
      Math.abs(w - ow) + Math.abs(s - os) + Math.abs(e - oe) + Math.abs(n - on) > 5;
    this.bounds = b;
    if (moved && this.ws?.readyState === WebSocket.OPEN) this.subscribe();
  }

  private subscribe() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const [w, s, e, n] = this.bounds;
    this.ws.send(
      JSON.stringify({
        APIKey: env("VITE_AISSTREAM_KEY"),
        BoundingBoxes: [
          [
            [s, w],
            [n, e],
          ],
        ],
        FilterMessageTypes: ["PositionReport", "ShipStaticData"],
      })
    );
  }

  connect() {
    if (!this.available) return;
    if (this.connecting || this.ws?.readyState === WebSocket.OPEN) return;
    if (Date.now() - this.lastConnectAttempt < 5000) return;
    this.lastConnectAttempt = Date.now();
    this.connecting = true;
    try {
      this.ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    } catch {
      this.connecting = false;
      return;
    }
    this.ws.onopen = () => {
      this.connecting = false;
      this.subscribe();
    };
    this.ws.onclose = () => {
      this.connecting = false;
      this.ws = null;
    };
    this.ws.onerror = () => {
      this.connecting = false;
    };
    this.ws.onmessage = (ev) => this.handle(ev);
  }

  private handle(ev: MessageEvent) {
    let msg: any;
    try {
      msg = JSON.parse(typeof ev.data === "string" ? ev.data : "");
    } catch {
      return;
    }
    const meta = msg?.MetaData;
    if (!meta) return;
    const mmsi = Number(meta.MMSI);
    if (!mmsi) return;
    const prev: Vessel = this.vessels.get(mmsi) ?? {
      mmsi,
      name: (meta.ShipName ?? "").trim() || `MMSI ${mmsi}`,
      lat: meta.latitude,
      lon: meta.longitude,
      ts: Date.now(),
    };
    if (msg.MessageType === "PositionReport") {
      const pr = msg.Message?.PositionReport ?? {};
      this.vessels.set(mmsi, {
        ...prev,
        lat: meta.latitude ?? prev.lat,
        lon: meta.longitude ?? prev.lon,
        sog: pr.Sog ?? prev.sog,
        cog: pr.Cog ?? prev.cog,
        ts: Date.now(),
      });
    } else if (msg.MessageType === "ShipStaticData") {
      const sd = msg.Message?.ShipStaticData ?? {};
      this.vessels.set(mmsi, {
        ...prev,
        name: (meta.ShipName ?? prev.name ?? "").trim() || prev.name,
        type: sd.Type ?? prev.type,
      });
    }
    // Drop stale vessels (no update in 20 min) to bound memory.
    if (this.vessels.size > 6000) {
      const cutoff = Date.now() - 20 * 60 * 1000;
      for (const [k, v] of this.vessels) if (v.ts < cutoff) this.vessels.delete(k);
    }
  }

  snapshot(tankersOnly: boolean): Vessel[] {
    const cutoff = Date.now() - 30 * 60 * 1000;
    const out: Vessel[] = [];
    for (const v of this.vessels.values()) {
      if (v.ts < cutoff) continue;
      if (tankersOnly && !(v.type && v.type >= 80 && v.type <= 89)) continue;
      out.push(v);
    }
    return out;
  }
}

export const ais = new AisManager();

function toLayer(tankersOnly: boolean): LayerData {
  if (!ais.available) {
    return {
      geojson: fc([]),
      needsKey: true,
      note: "Set VITE_AISSTREAM_KEY (free at aisstream.io) to stream live AIS vessels.",
    };
  }
  ais.connect();
  const vs = ais.snapshot(tankersOnly);
  const feats = vs.map((v) =>
    point(v.lon, v.lat, {
      title: v.name,
      mmsi: v.mmsi,
      speed_kn: v.sog ?? null,
      course: v.cog ?? null,
      ship_type: v.type ?? null,
      kind: tankersOnly ? "Oil/chemical tanker" : "Vessel",
    })
  );
  return {
    geojson: fc(feats),
    note:
      feats.length === 0
        ? "Connecting to AIS stream… vessels appear as position reports arrive."
        : undefined,
  };
}

export async function fetchVessels(ctx: FetchContext): Promise<LayerData> {
  ais.setBounds(ctx.bounds);
  return toLayer(false);
}

export async function fetchTankers(ctx: FetchContext): Promise<LayerData> {
  ais.setBounds(ctx.bounds);
  return toLayer(true);
}

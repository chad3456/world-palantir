import { create } from "zustand";

export interface LayerStatus {
  loading: boolean;
  error?: string;
  note?: string;
  count: number;
  needsKey?: boolean;
  updatedAt?: number;
}

interface AppState {
  activeLayers: Set<string>;
  status: Record<string, LayerStatus>;
  search: string;
  toggleLayer: (id: string) => void;
  setActive: (id: string, on: boolean) => void;
  setStatus: (id: string, s: Partial<LayerStatus>) => void;
  setSearch: (s: string) => void;
}

export const useStore = create<AppState>((set) => ({
  activeLayers: new Set<string>([
    "conflict-zones",
    "flights-commercial",
    "earthquakes",
  ]),
  status: {},
  search: "",
  toggleLayer: (id) =>
    set((st) => {
      const next = new Set(st.activeLayers);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { activeLayers: next };
    }),
  setActive: (id, on) =>
    set((st) => {
      const next = new Set(st.activeLayers);
      if (on) next.add(id);
      else next.delete(id);
      return { activeLayers: next };
    }),
  setStatus: (id, s) =>
    set((st) => ({
      status: { ...st.status, [id]: { ...st.status[id], ...s } as LayerStatus },
    })),
  setSearch: (s) => set({ search: s }),
}));

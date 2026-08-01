import { useMemo } from "react";
import { CATEGORIES, LAYERS } from "../layers";
import { useStore } from "../store";

export function Sidebar() {
  const active = useStore((s) => s.activeLayers);
  const status = useStore((s) => s.status);
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const toggle = useStore((s) => s.toggleLayer);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return LAYERS.filter(
      (l) =>
        !q ||
        l.label.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="brand">
          <span className="brand-dot" /> WORLD PALANTIR
        </div>
        <div className="brand-sub">GLOBAL OSINT MONITOR</div>
      </div>

      <input
        className="search"
        placeholder="Search layers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="layers">
        {CATEGORIES.map((cat) => {
          const items = filtered.filter((l) => l.category === cat);
          if (!items.length) return null;
          return (
            <div className="cat" key={cat}>
              <div className="cat-title">{cat}</div>
              {items.map((l) => {
                const on = active.has(l.id);
                const st = status[l.id];
                return (
                  <label className={`layer-row ${on ? "on" : ""}`} key={l.id}>
                    <input type="checkbox" checked={on} onChange={() => toggle(l.id)} />
                    <span
                      className="swatch"
                      style={{ background: l.style.color }}
                      aria-hidden
                    />
                    <span className="layer-label">
                      {l.label}
                      {l.kind === "live" && <span className="live-tag">LIVE</span>}
                    </span>
                    {on && st && (
                      <span className="layer-meta" title={st.error || st.note || ""}>
                        {st.loading
                          ? "…"
                          : st.error
                          ? "⚠"
                          : st.needsKey
                          ? "🔑"
                          : st.count}
                      </span>
                    )}
                    <span className="info" title={`${l.description}\n\nSource: ${l.source}`}>
                      i
                    </span>
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="sidebar-foot">
        Data is fetched live in your browser. Some layers need a free API key —
        see <code>.env.example</code>.
      </div>
    </aside>
  );
}

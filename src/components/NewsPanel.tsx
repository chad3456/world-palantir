import { useEffect, useRef, useState } from "react";
import { fetchNews } from "../lib/sources/gdelt";
import type { NewsItem } from "../types";
import { timeAgo } from "../lib/util";

const FEEDS: { id: string; label: string; query: string }[] = [
  { id: "top", label: "Top", query: "(geopolitics OR military OR conflict OR sanctions OR crisis)" },
  { id: "conflict", label: "Conflict", query: "(war OR airstrike OR offensive OR ceasefire OR militants)" },
  { id: "energy", label: "Energy", query: "(oil OR gas OR pipeline OR opec OR lng OR tanker)" },
  { id: "cyber", label: "Cyber", query: "(cyberattack OR ransomware OR data breach OR hacking)" },
  { id: "econ", label: "Economy", query: "(tariff OR sanctions OR trade war OR export controls)" },
];

export function NewsPanel() {
  const [feed, setFeed] = useState(FEEDS[0].id);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const def = FEEDS.find((f) => f.id === feed)!;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setErr(null);
    fetchNews(def.query, ac.signal, 60)
      .then((n) => {
        if (!ac.signal.aborted) setItems(n);
      })
      .catch((e) => {
        if (!ac.signal.aborted) setErr(e?.message ?? "feed error");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    const t = window.setInterval(() => {
      fetchNews(def.query, ac.signal, 60)
        .then((n) => !ac.signal.aborted && setItems(n))
        .catch(() => {});
    }, 5 * 60_000);
    return () => {
      ac.abort();
      clearInterval(t);
    };
  }, [feed]);

  return (
    <section className={`news ${collapsed ? "collapsed" : ""}`}>
      <header className="news-head">
        <span className="news-title">
          LIVE FEED <span className="news-count">{items.length}</span>
        </span>
        <button className="collapse-btn" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? "‹" : "›"}
        </button>
      </header>
      {!collapsed && (
        <>
          <div className="news-tabs">
            {FEEDS.map((f) => (
              <button
                key={f.id}
                className={`tab ${feed === f.id ? "on" : ""}`}
                onClick={() => setFeed(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="news-list">
            {loading && items.length === 0 && <div className="news-empty">Loading…</div>}
            {err && <div className="news-empty">Feed unavailable: {err}</div>}
            {items.map((it, i) => (
              <a
                className="news-item"
                key={i}
                href={it.url}
                target="_blank"
                rel="noreferrer"
              >
                <div className="news-item-title">{it.title}</div>
                <div className="news-item-meta">
                  <span>{it.domain ?? it.source}</span>
                  {it.publishedAt && <span>{timeAgo(it.publishedAt)}</span>}
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

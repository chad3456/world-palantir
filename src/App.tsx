import { useEffect, useState } from "react";
import { MapView } from "./components/MapView";
import { Sidebar } from "./components/Sidebar";
import { NewsPanel } from "./components/NewsPanel";
import { useStore } from "./store";

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = now.toUTCString().replace("GMT", "UTC");
  return <span className="clock">{s}</span>;
}

export function App() {
  const active = useStore((s) => s.activeLayers);
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo">◎ WORLD&nbsp;PALANTIR</span>
          <span className="ver">v0.1</span>
        </div>
        <div className="topbar-center">
          <span className="live-pill">
            <span className="live-blip" /> LIVE
          </span>
          <Clock />
        </div>
        <div className="topbar-right">
          <span className="active-count">{active.size} layers active</span>
        </div>
      </header>
      <div className="body">
        <Sidebar />
        <main className="stage">
          <MapView />
          <NewsPanel />
        </main>
      </div>
    </div>
  );
}

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Same-origin proxy for APIs that don't send CORS headers (GDELT, OpenSky).
    // The browser calls /api-gdelt/... and Vite forwards it server-side.
    proxy: {
      "/api-gdelt": {
        target: "https://api.gdeltproject.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api-gdelt/, ""),
      },
      "/api-opensky": {
        target: "https://opensky-network.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api-opensky/, ""),
      },
      "/api-celestrak": {
        target: "https://celestrak.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api-celestrak/, ""),
      },
      "/api-usgs": {
        target: "https://earthquake.usgs.gov",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api-usgs/, ""),
      },
      "/api-gpsjam": {
        target: "https://gpsjam.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api-gpsjam/, ""),
      },
    },
  },
  // Mirror the proxy for `npm run preview` (note: the built bundle only emits
  // /api-* paths when VITE_DEV_PROXY is forced; prefer `npm run dev` for testing).
  preview: {
    port: 4173,
    proxy: {
      "/api-gdelt": { target: "https://api.gdeltproject.org", changeOrigin: true, rewrite: (p) => p.replace(/^\/api-gdelt/, "") },
      "/api-opensky": { target: "https://opensky-network.org", changeOrigin: true, rewrite: (p) => p.replace(/^\/api-opensky/, "") },
      "/api-celestrak": { target: "https://celestrak.org", changeOrigin: true, rewrite: (p) => p.replace(/^\/api-celestrak/, "") },
      "/api-usgs": { target: "https://earthquake.usgs.gov", changeOrigin: true, rewrite: (p) => p.replace(/^\/api-usgs/, "") },
      "/api-gpsjam": { target: "https://gpsjam.org", changeOrigin: true, rewrite: (p) => p.replace(/^\/api-gpsjam/, "") },
    },
  },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1500,
  },
});

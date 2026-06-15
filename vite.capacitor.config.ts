/**
 * vite.capacitor.config.ts
 *
 * Dedicated Vite build config for the Android / Capacitor SPA.
 * Intentionally does NOT include the TanStack Start (SSR) plugin — that
 * plugin is for the web server build only.
 *
 * Entry: index.html → src/spa-entry.tsx
 * Output: dist/client/  (same directory that capacitor.config.ts points to)
 */
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
  ],

  define: {
    "import.meta.env.VITE_SPA": JSON.stringify(true),
  },

  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    // Generate Vite's manifest.json (used by generate-capacitor-html.mjs)
    manifest: true,
    rollupOptions: {
      input: "index.html",
    },
  },

  // Resolve the same path aliases as the main app
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});

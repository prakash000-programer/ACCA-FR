/**
 * spa-entry.tsx — Client-side SPA entry for Capacitor / Android builds.
 *
 * This file is used by vite.capacitor.config.ts (NOT the regular SSR build).
 * It bootstraps the app using createRoot() instead of hydrateRoot(),
 * so no server-rendered HTML is required.
 *
 * The route tree and all route components are shared with the SSR build —
 * only the initialization strategy differs.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

// Import CSS directly so Vite bundles it into the APK (prevents blank screen
// that occurs when HeadContent alone is relied on for stylesheet injection)
import "./styles.css";

const router = getRouter();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("No #root element found — check index.html");
}

createRoot(rootEl).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

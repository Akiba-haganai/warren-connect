import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "@/utils/pwa-register";
import { PWAInstaller } from "@/utils/install-prompt";
import * as Sentry from "@sentry/react";
import { initLifecycleTelemetry } from "@/utils/uploadTelemetry";

// Initialize lifecycle tracking early
initLifecycleTelemetry();

// Initialize Sentry for Live Error Tracking

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.PROD ? "production" : "development",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}


// Intercept Vite dynamic import chunk loading errors (occurs on new deployment)
window.addEventListener("vite:preloadError", (event) => {
  console.warn("Vite preload error, hard reloading to fetch new chunks", event);
  window.location.reload();
});

registerServiceWorker({
  onError: (err) => console.warn("[PWA]", err),
});

new PWAInstaller({
  onError: (err) => console.warn("[PWAInstaller]", err),
}).init();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
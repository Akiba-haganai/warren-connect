import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "@/utils/pwa-register";
import * as Sentry from "@sentry/react";
// import { initLifecycleTelemetry } from "@/utils/uploadTelemetry";

// Initialize lifecycle tracking early
// initLifecycleTelemetry();


// Initialize Sentry for Live Error Tracking
Sentry.init({
  dsn: "https://476ca570c4a0711deb35515cedb62e8b@o4511632845635584.ingest.de.sentry.io/4511951429238864",
  environment: import.meta.env.PROD ? "production" : "development",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  // Capture 20% of transactions for performance monitoring
  tracesSampleRate: 0.2, 
  // Session Replays block the main thread during initial load, only capture on error
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
});


// Intercept Vite dynamic import chunk loading errors (occurs on new deployment)
window.addEventListener("vite:preloadError", (event) => {
  console.warn("Vite preload error, hard reloading to fetch new chunks", event);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) {
        reg.update();
      }
    });
  }
  const lastReload = sessionStorage.getItem("vite_chunk_reload");
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem("vite_chunk_reload", String(now));
    window.location.reload();
  }
});

// Generic corrupted-state / boot failure recovery
const BOOT_FAILURE_KEY = "plawza-boot-failures";
const MAX_BOOT_FAILURES = 3;

function recordBootFailureAndMaybeRecover() {
  const count = Number(sessionStorage.getItem(BOOT_FAILURE_KEY) || "0") + 1;
  sessionStorage.setItem(BOOT_FAILURE_KEY, String(count));
  if (count >= MAX_BOOT_FAILURES) {
    sessionStorage.removeItem(BOOT_FAILURE_KEY);
    (async () => {
      try {
        const regs = await navigator.serviceWorker?.getRegistrations?.();
        await Promise.all((regs || []).map((r) => r.unregister()));
        const keys = await caches?.keys?.();
        await Promise.all((keys || []).map((k) => caches.delete(k)));
      } catch {}
      window.location.reload();
    })();
  }
}

window.addEventListener("error", recordBootFailureAndMaybeRecover);
window.addEventListener("unhandledrejection", recordBootFailureAndMaybeRecover);

registerServiceWorker({
  onError: (err) => console.warn("[PWA]", err),
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Clear boot failure count after initial render starts cleanly
sessionStorage.removeItem(BOOT_FAILURE_KEY);
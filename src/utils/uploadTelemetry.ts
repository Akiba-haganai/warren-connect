// Lazy Sentry accessor — avoids a static import that would pull the
// entire 264 KB vendor-sentry chunk into the critical path via the
// App.tsx → DiagnosticOverlay → uploadTelemetry chain.
// The module is fetched only the first time an upload action runs.
async function getSentry() {
  if (typeof window === "undefined") return null;
  try {
    return await import("@sentry/react");
  } catch {
    return null;
  }
}

const TELEMETRY_KEY = "plawza_upload_telemetry";

export interface TelemetryEvent {
  id: string;
  timestamp: number;
  attemptId: string | null;
  stage: string;
  message: string;
  metadata?: Record<string, any>;
}

let currentAttemptId: string | null = null;

export const uploadTelemetry = {
  startAttempt: (source: string) => {
    currentAttemptId = `UPLOAD_ATTEMPT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    uploadTelemetry.log("picker_opened", `Opened picker from ${source}`, { source });
    return currentAttemptId;
  },

  getAttemptId: () => currentAttemptId,

  setAttemptId: (id: string | null) => {
    currentAttemptId = id;
  },

  log: (stage: string, message: string, metadata?: Record<string, any>) => {
    const event: TelemetryEvent = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      attemptId: currentAttemptId,
      stage,
      message,
      metadata,
    };

    console.log(`[Telemetry] ${stage}: ${message}`, metadata || "");

    getSentry().then((S) => {
      S?.addBreadcrumb({
        category: "image_upload",
        message: `${stage}: ${message}`,
        data: { attemptId: currentAttemptId, ...metadata },
        level: stage.includes("error") || stage.includes("fail") ? "error" : "info",
      });
    });

    try {
      const existing = localStorage.getItem(TELEMETRY_KEY);
      const logs: TelemetryEvent[] = existing ? JSON.parse(existing) : [];
      logs.push(event);
      if (logs.length > 200) logs.shift();
      localStorage.setItem(TELEMETRY_KEY, JSON.stringify(logs));
    } catch (err) {
      console.warn("Failed to persist telemetry to localStorage", err);
    }
  },

  reportError: (stage: string, error: any, metadata?: Record<string, any>) => {
    uploadTelemetry.log(stage, error?.message || "Unknown error", { error, ...metadata });
    getSentry().then((S) => {
      S?.captureException(error, {
        tags: { attemptId: currentAttemptId, stage },
        extra: metadata,
      });
    });
  },

  getLogs: (): TelemetryEvent[] => {
    try {
      const existing = localStorage.getItem(TELEMETRY_KEY);
      return existing ? JSON.parse(existing) : [];
    } catch {
      return [];
    }
  },

  clearLogs: () => {
    try {
      localStorage.removeItem(TELEMETRY_KEY);
    } catch {}
  },
};

export function initLifecycleTelemetry() {
  const logLifecycle = (event: string, extra?: any) => {
    uploadTelemetry.log(`lifecycle_${event}`, `Window event: ${event}`, {
      visibilityState: document.visibilityState,
      ...extra,
    });
  };

  if (typeof performance !== "undefined") {
    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      uploadTelemetry.log("lifecycle_navigation", `Page loaded via ${navEntries[0].type}`, {
        type: navEntries[0].type,
      });
    }
  }

  document.addEventListener("visibilitychange", () => logLifecycle("visibilitychange"));
  window.addEventListener("pagehide", (e) => logLifecycle("pagehide", { persisted: e.persisted }));
  window.addEventListener("pageshow", (e) => logLifecycle("pageshow", { persisted: e.persisted }));
  window.addEventListener("beforeunload", () => logLifecycle("beforeunload"));
  document.addEventListener("freeze", () => logLifecycle("freeze"));
  document.addEventListener("resume", () => logLifecycle("resume"));
}

import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import toast from "react-hot-toast";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useVersionCheck } from "@/hooks/useVersionCheck";

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Poll on visibility change (foregrounding)
        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(console.error);
          }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        
        // Backup: Poll every 60 seconds
        const intervalId = setInterval(() => {
          registration.update().catch(console.error);
        }, 60 * 1000);

        return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          clearInterval(intervalId);
        };
      }
    },
  });

  const { updateAvailable } = useVersionCheck();
  const [clearing, setClearing] = useState(false);

  // Auto-refresh when Service Worker detects an update
  useEffect(() => {
    if (needRefresh) {
      toast.loading("App updated — refreshing…", { duration: 2000 });
      const timer = setTimeout(() => {
        updateServiceWorker(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [needRefresh, updateServiceWorker]);

  const handleForceRefresh = async () => {
    setClearing(true);
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      toast.success("Cache cleared! Reloading…");
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      console.error("Force refresh failed:", err);
      window.location.reload();
    }
  };

  // If the SW fails to auto-update, but version.json has a mismatch, show diagnostic escape hatch
  if (updateAvailable && !needRefresh) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[100] flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/90 backdrop-blur-md px-4 py-3 shadow-xl max-w-[92vw] w-max animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
            A new version of PLAWZA is available, but loading is delayed.
          </span>
        </div>
        <button
          type="button"
          onClick={handleForceRefresh}
          disabled={clearing}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${clearing ? "animate-spin" : ""}`} />
          {clearing ? "Clearing…" : "Force Refresh"}
        </button>
      </div>
    );
  }

  return null;
}

export default UpdatePrompt;

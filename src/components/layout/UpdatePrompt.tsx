import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Sparkles, RefreshCw } from "lucide-react";
import { useVersionCheck } from "@/hooks/useVersionCheck";

export function UpdatePrompt() {
  const { updateAvailable, checkVersion } = useVersionCheck();
  const [updating, setUpdating] = useState(false);

  // Poll Vercel version.json every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkVersion();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [checkVersion]);

  const handleApplyUpdate = async () => {
    setUpdating(true);
    toast.loading("Applying latest PLAWZA update…", { id: "pwa-update" });
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
          await reg.unregister();
        }
      }

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } catch {
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(5.2rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[200] flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-teal-500/40 dark:border-teal-500/30 bg-teal-900/95 dark:bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 shadow-2xl max-w-[92vw] w-max animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-teal-300 animate-pulse shrink-0" />
        <span className="text-xs font-semibold">
          A new version of PLAWZA is available!
        </span>
      </div>
      <button
        type="button"
        onClick={handleApplyUpdate}
        disabled={updating}
        className="inline-flex items-center gap-1.5 rounded-full bg-teal-400 hover:bg-teal-300 active:bg-teal-500 px-3.5 py-1.5 text-xs font-bold text-teal-950 shadow-sm transition-all cursor-pointer disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${updating ? "animate-spin" : ""}`} />
        {updating ? "Updating…" : "Update Now"}
      </button>
    </div>
  );
}

export default UpdatePrompt;

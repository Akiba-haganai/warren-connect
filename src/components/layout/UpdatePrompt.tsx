import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw } from "lucide-react";

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Poll for SW updates every 60 seconds so open tabs discover new deploys
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 shadow-xl max-w-[92vw] w-max animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
        A new version of Warren is available
      </span>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Reload
      </button>
    </div>
  );
}

export default UpdatePrompt;

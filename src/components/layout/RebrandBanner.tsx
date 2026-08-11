import { useEffect, useState } from "react";

const REBRAND_KEY = "market_rebrand_seen_v1";

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // LocalStorage blocked
  }
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as any).standalone === true;
  return Boolean(mql || iosStandalone);
}

export function RebrandBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isStandaloneDisplay()) return;
    if (safeGetItem(REBRAND_KEY)) return;
    setShowBanner(true);
  }, []);

  const dismiss = () => {
    safeSetItem(REBRAND_KEY, "true");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl bg-slate-900 dark:bg-slate-950 text-white p-4 shadow-xl border border-slate-800 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex-1 text-sm text-left">
        <p className="font-bold text-blue-400">We've renamed to Market! 🎉</p>
        <p className="text-slate-300 text-xs mt-1 leading-relaxed">
          Your installed home-screen app icon might still show the old "Campus" identity. Remove the old app and add "Market" again from your browser menu to get the latest icon and name.
        </p>
      </div>
      <button
        onClick={dismiss}
        className="bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors"
      >
        Got it
      </button>
    </div>
  );
}

export default RebrandBanner;

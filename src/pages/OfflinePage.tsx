import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 animate-pulse">
        <WifiOff size={32} />
      </div>
      <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
        You&apos;re Offline
      </h1>
      <p className="text-xs text-slate-500 max-w-xs mb-6 leading-relaxed">
        Please check your internet connection. Saved listings and cached posts are still accessible when you reconnect.
      </p>
      <button
        onClick={handleReload}
        className="btn-primary w-auto px-6 py-2.5 text-xs font-bold flex items-center gap-2 shadow-md"
      >
        <RefreshCw size={14} /> Try Reconnecting
      </button>
    </div>
  );
}

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export default function UpdateToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener("pwa-update-available", handler);
    return () => window.removeEventListener("pwa-update-available", handler);
  }, []);

  const handleUpdate = () => {
    // Skip waiting and reload
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    });
    window.location.reload();
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 card p-4 flex items-center gap-3">
      <RefreshCw size={20} style={{ color: "var(--color-primary)" }} />
      <p className="text-sm flex-1" style={{ color: "var(--color-text)" }}>
        New version available
      </p>
      <button onClick={handleUpdate} className="btn-primary w-auto px-4 py-2 text-xs">
        Update
      </button>
    </div>
  );
}
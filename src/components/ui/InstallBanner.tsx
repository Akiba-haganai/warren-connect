import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";
import { triggerUpdate } from "@/pwa/registerSW";

export default function InstallBanner() {
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after 30 seconds or 3 page visits
      setTimeout(() => setShowInstall(true), 30000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const onUpdate = () => setShowUpdate(true);
    window.addEventListener("pwa-update-available", onUpdate);
    return () => window.removeEventListener("pwa-update-available", onUpdate);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log("Install outcome:", outcome);
      setDeferredPrompt(null);
    }
    setShowInstall(false);
  };

  const handleUpdate = () => {
    triggerUpdate();
    setShowUpdate(false);
  };

  return (
    <AnimatePresence>
      {showInstall && (
        <motion.div
          initial={{ y: 200 }}
          animate={{ y: 0 }}
          exit={{ y: 200 }}
          className="fixed bottom-20 left-4 right-4 z-50 card p-4 flex items-center gap-3"
        >
          <div className="flex-1">
            <p className="text-sm font-semibold">Add Warren Connect to Home Screen</p>
            <p className="text-xs text-gray-500">Instant access, offline ready</p>
          </div>
          <button onClick={handleInstall} className="btn-primary w-auto px-4 py-2 text-xs">
            <Download size={14} /> Install
          </button>
          <button onClick={() => setShowInstall(false)} className="p-1">
            <X size={16} />
          </button>
        </motion.div>
      )}
      {showUpdate && (
        <motion.div
          initial={{ y: 200 }}
          animate={{ y: 0 }}
          exit={{ y: 200 }}
          className="fixed bottom-20 left-4 right-4 z-50 card p-4 flex items-center gap-3"
        >
          <div className="flex-1">
            <p className="text-sm font-semibold">New version available!</p>
            <p className="text-xs text-gray-500">Tap to update</p>
          </div>
          <button onClick={handleUpdate} className="btn-primary w-auto px-4 py-2 text-xs">
            Update
          </button>
          <button onClick={() => setShowUpdate(false)} className="p-1">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
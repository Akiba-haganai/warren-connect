import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "@/utils/pwa-register";
import { PWAInstaller } from "@/utils/install-prompt";
import toast from "react-hot-toast";

registerServiceWorker({
  onUpdateReady: (activate) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold">A new version of PLAWZA is ready!</span>
        <button
          type="button"
          onClick={() => {
            toast.dismiss(t.id);
            activate();
          }}
          className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg"
        >
          Reload
        </button>
      </div>
    ), { duration: 10000 });
  },
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
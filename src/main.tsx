import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "@/utils/pwa-register";
import { PWAInstaller } from "@/utils/install-prompt";

registerServiceWorker({
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
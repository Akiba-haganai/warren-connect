import { registerSW } from "virtual:pwa-register";

// Expose a function to trigger update
let updateSW: (reloadPage?: boolean) => Promise<void>;

export const registerServiceWorker = () => {
  updateSW = registerSW({
    immediate: false, // we handle updates manually
    onNeedRefresh() {
      // We'll show a custom toast/banner instead of confirm
      window.dispatchEvent(new CustomEvent("pwa-update-available"));
    },
    onOfflineReady() {
      console.log("✅ App ready for offline use");
      window.dispatchEvent(new CustomEvent("pwa-offline-ready"));
    },
  });
};

export const triggerUpdate = () => updateSW?.(true);
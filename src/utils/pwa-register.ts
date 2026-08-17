/**
 * pwa-register.ts
 * -----------------------------------------------------------------
 * Registers the service worker and drives the update lifecycle.
 * Never reloads or hands control to a new SW without the caller's
 * consent — that consent point is what prevents deadlocks/races
 * between old and new SW versions.
 *
 * Usage:
 *   import { registerServiceWorker } from './pwa-register';
 *
 *   registerServiceWorker({
 *     onUpdateReady: (activate) => {
 *       if (confirm('New version available. Reload?')) activate();
 *     },
 *     onError: (err) => console.error('SW error:', err),
 *   });
 */

interface RegisterOptions {
  onUpdateReady?: (activate: () => void) => void;
  onError?: (err: Error) => void;
}

export function registerServiceWorker({ onUpdateReady, onError }: RegisterOptions = {}) {
  if (!('serviceWorker' in navigator)) {
    // Not a fatal error — just means offline/installability features
    // silently degrade to "regular website" on this browser.
    onError?.(new Error('Service workers are not supported in this browser.'));
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');

      // Case 1: an update was already installed and is waiting
      // (e.g. the user closed the tab mid-update last session).
      if (registration.waiting) {
        onUpdateReady?.(() => activateUpdate(registration));
      }

      // Case 2: a new SW starts installing during this session.
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          const isFirstInstall = !navigator.serviceWorker.controller;
          if (newWorker.state === 'installed' && !isFirstInstall) {
            onUpdateReady?.(() => activateUpdate(registration));
          }
        });
      });

      // Reload exactly once, only after the new SW actually takes
      // control. The `refreshing` guard stops the double-reload
      // loop that happens if controllerchange fires more than once.
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (err: any) {
      onError?.(err);
    }
  });
}

function activateUpdate(registration: ServiceWorkerRegistration) {
  registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
}

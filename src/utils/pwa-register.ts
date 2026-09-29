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

let currentRegistration: ServiceWorkerRegistration | null = null;

export function registerServiceWorker({ onUpdateReady, onError }: RegisterOptions = {}) {
  if (!('serviceWorker' in navigator)) {
    // Not a fatal error — just means offline/installability features
    // silently degrade to "regular website" on this browser.
    onError?.(new Error('Service workers are not supported in this browser.'));
    return;
  }

  // Capture BEFORE register() — if no controller exists yet this is a
  // first install. The SW's clients.claim() fires controllerchange on
  // first install too, and we must NOT reload then (causes the double
  // paint visible in the waterfall at row 32).
  const hadController = !!navigator.serviceWorker.controller;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      currentRegistration = registration;

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

      // Reload exactly once when the new SW takes control — but ONLY if
      // there was already a controller before this page load (i.e. this
      // is an update, not a first install). First-install controllerchange
      // from clients.claim() must be swallowed.
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (err: any) {
      onError?.(err);
    }
  });
}

/**
 * Call this from useVersionCheck or visibility changes to trigger
 * an immediate check for a new service worker script.
 */
export function checkForServiceWorkerUpdate() {
  currentRegistration?.update().catch(() => {
    // Non-fatal: browser will still poll on its own schedule.
  });
}

function activateUpdate(registration: ServiceWorkerRegistration) {
  registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
}

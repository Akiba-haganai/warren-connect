/**
 * install-prompt.ts
 * -----------------------------------------------------------------
 * Cross-device install banner.
 *
 *  - Chrome / Edge / Android: listens for `beforeinstallprompt`,
 *    shows a custom button, calls .prompt() on click.
 *  - iOS Safari: `beforeinstallprompt` does not exist at all, so we
 *    show manual "Add to Home Screen" instructions instead.
 *  - Firefox desktop / unsupported browsers: banner simply never
 *    appears — no error, no dead button.
 *  - Already installed: banner never appears.
 *  - Guards against the prompt being called twice (deferredPrompt
 *    is single-use by spec) and against storage access throwing in
 *    private browsing modes.
 *
 * Usage:
 *   import { PWAInstaller } from './install-prompt';
 *   const installer = new PWAInstaller({ onError: console.warn });
 *   installer.init();
 */

interface PWAInstallerOptions {
  onError?: (err: Error) => void;
  dismissStorageKey?: string;
}

export class PWAInstaller {
  private deferredPrompt: any = null;
  private onError: (err: Error) => void;
  private dismissStorageKey: string;
  private banner: HTMLElement | null = null;

  constructor({ onError, dismissStorageKey = 'pwa-install-dismissed' }: PWAInstallerOptions = {}) {
    this.onError = onError || ((e) => console.error('[PWAInstaller]', e));
    this.dismissStorageKey = dismissStorageKey;

    this._handleBeforeInstall = this._handleBeforeInstall.bind(this);
    this._handleAppInstalled = this._handleAppInstalled.bind(this);

    window.addEventListener('beforeinstallprompt', this._handleBeforeInstall);
    window.addEventListener('appinstalled', this._handleAppInstalled);
  }

  isStandalone(): boolean {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true // iOS-specific flag
    );
  }

  isIOS(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
  }

  wasDismissed(): boolean {
    try {
      return localStorage.getItem(this.dismissStorageKey) === 'true';
    } catch {
      // Safari private mode / storage disabled — treat as "not dismissed"
      // rather than crashing the whole flow over a non-essential read.
      return false;
    }
  }

  dismiss(): void {
    try {
      localStorage.setItem(this.dismissStorageKey, 'true');
    } catch {
      // Non-fatal: dismissal just won't persist across sessions.
    }
    this._removeBanner();
  }

  /** Call once, after DOM is ready. */
  init(): void {
    if (this.isStandalone() || this.wasDismissed()) return;

    // iOS never fires beforeinstallprompt, so this is the only path
    // that will ever show a banner on that platform.
    if (this.isIOS()) {
      this._showBanner({ mode: 'ios' });
    }
    // On every other platform we simply wait — beforeinstallprompt
    // fires asynchronously and may never fire if install criteria
    // (manifest, HTTPS, service worker, engagement heuristics)
    // aren't met. That's expected behavior, not an error.
  }

  private _handleBeforeInstall(event: Event): void {
    event.preventDefault(); // stop the native mini-infobar; we show our own UI
    this.deferredPrompt = event;
    if (!this.wasDismissed()) this._showBanner({ mode: 'native' });
  }

  private _handleAppInstalled(): void {
    this._removeBanner();
    this.deferredPrompt = null;
    try {
      localStorage.removeItem(this.dismissStorageKey);
    } catch {
      /* ignore */
    }
  }

  async promptInstall(): Promise<{ outcome: string }> {
    if (!this.deferredPrompt) {
      // Happens if: prompt() was already called once, the banner
      // button was clicked twice quickly, or init() ran on a
      // browser that never fired beforeinstallprompt at all.
      this.onError(new Error('Install prompt unavailable — already used or not supported.'));
      return { outcome: 'unavailable' };
    }

    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null; // spec: each prompt event is single-use
      if (choice.outcome === 'dismissed') this.dismiss();
      else this._removeBanner();
      return choice;
    } catch (err: any) {
      this.onError(err);
      this.deferredPrompt = null;
      return { outcome: 'error' };
    }
  }

  private _showBanner({ mode }: { mode: 'ios' | 'native' }): void {
    if (this.banner) return;

    const banner = document.createElement('div');
    banner.className = 'pwa-install-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Install app');
    banner.style.cssText = `
      position: fixed; left: 16px; right: 16px; bottom: 16px; z-index: 9999;
      max-width: 480px; margin: 0 auto;
      background: var(--pwa-banner-bg, #00897B); color: var(--pwa-banner-fg, #fff);
      padding: 14px 16px; border-radius: 14px;
      display: flex; items-center: center; gap: 12px;
      font: 14px/1.4 system-ui, -apple-system, sans-serif;
      box-shadow: 0 8px 24px rgba(0,0,0,0.28);
    `;

    const text = document.createElement('span');
    text.style.flex = '1';
    text.textContent =
      mode === 'ios'
        ? 'Install PLAWZA: tap Share, then "Add to Home Screen".'
        : 'Install PLAWZA for a faster, full-screen experience.';
    banner.appendChild(text);

    if (mode === 'native') {
      const installBtn = document.createElement('button');
      installBtn.type = 'button';
      installBtn.textContent = 'Install';
      installBtn.style.cssText = `
        background: #fff; color: #00897B; border: none;
        border-radius: 8px; padding: 8px 14px; font-weight: 700; cursor: pointer;
        flex-shrink: 0;
      `;
      installBtn.addEventListener('click', () => this.promptInstall());
      banner.appendChild(installBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Dismiss install banner');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: transparent; color: inherit; border: none;
      font-size: 16px; line-height: 1; cursor: pointer; opacity: 0.8;
      flex-shrink: 0; padding: 4px;
    `;
    closeBtn.addEventListener('click', () => this.dismiss());
    banner.appendChild(closeBtn);

    document.body.appendChild(banner);
    this.banner = banner;
  }

  private _removeBanner(): void {
    this.banner?.remove();
    this.banner = null;
  }
}

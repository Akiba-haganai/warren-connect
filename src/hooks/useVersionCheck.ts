import { useEffect, useState } from "react";

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  const checkVersion = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.version) {
        setServerVersion(data.version);
        // Compare with local __APP_VERSION__ defined at compile-time
        if (data.version !== __APP_VERSION__) {
          setUpdateAvailable(true);
        } else {
          setUpdateAvailable(false);
        }
      }
    } catch {
      // Silently degrade on network offline/timeout during version check
    }
  };

  useEffect(() => {
    checkVersion();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return {
    updateAvailable,
    currentVersion: __APP_VERSION__,
    serverVersion,
    checkVersion,
  };
}

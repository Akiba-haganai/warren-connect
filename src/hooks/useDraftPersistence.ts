import { useEffect, useRef } from "react";

export function useDraftPersistence<T extends Record<string, any>>(
  storageKey: string,
  currentValue?: T,
  onRestore?: (saved: T) => void
) {
  const isRestored = useRef(false);

  // On mount, restore draft if available
  useEffect(() => {
    if (!storageKey || !onRestore) return;
    try {
      // Check localStorage first (survives Android process kills & reloads), fallback to sessionStorage
      const saved = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          onRestore(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to restore draft from storage:", e);
    } finally {
      // Mark as restored so the save effect can start syncing safely without wiping on mount
      isRestored.current = true;
    }
  }, [storageKey]);

  // Sync current value to localStorage on update (ONLY after initial restore!)
  useEffect(() => {
    if (!storageKey || !currentValue || !isRestored.current) return;
    try {
      const hasValue = Object.values(currentValue).some((val) => {
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === "string") return val.trim().length > 0;
        return Boolean(val);
      });

      if (hasValue) {
        localStorage.setItem(storageKey, JSON.stringify(currentValue));
      } else {
        localStorage.removeItem(storageKey);
        sessionStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.warn("Failed to save draft to storage:", e);
    }
  }, [storageKey, currentValue]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(storageKey);
      sessionStorage.removeItem(storageKey);
    } catch {}
  };

  return {
    clearDraft,
  };
}


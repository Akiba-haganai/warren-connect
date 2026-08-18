import { useEffect } from "react";

export function useDraftPersistence<T extends Record<string, any>>(
  storageKey: string,
  currentValue?: T,
  onRestore?: (saved: T) => void
) {
  // On mount, restore draft if available
  useEffect(() => {
    if (!storageKey || !onRestore) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          onRestore(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to restore draft from storage:", e);
    }
  }, [storageKey]);

  // Sync current value to sessionStorage on update
  useEffect(() => {
    if (!storageKey || !currentValue) return;
    try {
      const hasValue = Object.values(currentValue).some((val) => {
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === "string") return val.trim().length > 0;
        return Boolean(val);
      });

      if (hasValue) {
        sessionStorage.setItem(storageKey, JSON.stringify(currentValue));
      } else {
        sessionStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.warn("Failed to save draft to storage:", e);
    }
  }, [storageKey, currentValue]);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
  };

  return {
    clearDraft,
  };
}

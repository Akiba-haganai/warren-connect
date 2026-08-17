import { useEffect, useRef } from "react";

export function useDraftPersistence<T extends Record<string, any>>(
  key: string,
  state: T,
  setState: (draft: Partial<T> | ((prev: T) => T)) => void
) {
  const hydrated = useRef(false);

  // Restore once on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setState(parsed);
        }
      }
    } catch (err) {
      console.warn(`Failed to restore draft for ${key}:`, err);
    } finally {
      hydrated.current = true;
    }
  }, [key]);

  // Persist on every state change, lightly debounced
  useEffect(() => {
    if (!hydrated.current) return;
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(key, JSON.stringify(state));
      } catch (err) {
        console.warn(`Failed to save draft for ${key}:`, err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [key, state]);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  };

  return { clearDraft };
}

import { useState, useEffect, useCallback } from "react";
import { storageService } from "@/services/storage/storageService";

export interface RecentItem {
  id: string;
  type: "product" | "accommodation";
  title: string;
  imageUrl?: string | null;
  price?: number | null;
  location?: string | null;
  timestamp: number;
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("recentlyViewed");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RecentItem[];
        setItems(parsed);
      } catch {}
    }
  }, []);

  const addToRecent = useCallback(
    (item: Omit<RecentItem, "timestamp">) => {
      setItems((prev) => {
        const filtered = prev.filter(
          (i) => !(i.id === item.id && i.type === item.type)
        );
        const resolvedUrl = item.imageUrl
          ? storageService.getPublicUrl(
              item.type === "product" ? "product-images" : "accommodation-images",
              item.imageUrl
            )
          : null;
        const updated = [
          { ...item, imageUrl: resolvedUrl, timestamp: Date.now() },
          ...filtered,
        ].slice(0, 10);
        localStorage.setItem("recentlyViewed", JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const removeRecent = useCallback((id: string, type: "product" | "accommodation") => {
    setItems((prev) => {
      const updated = prev.filter((i) => !(i.id === id && i.type === type));
      localStorage.setItem("recentlyViewed", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setItems([]);
    localStorage.removeItem("recentlyViewed");
  }, []);

  return { recentItems: items, addToRecent, removeRecent, clearRecent };
}
import { useState, useEffect } from "react";

interface RecentItem {
  id: string;
  type: "product" | "accommodation";
  title: string;
  imageUrl?: string | null;
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

  const addToRecent = (item: Omit<RecentItem, "timestamp">) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => !(i.id === item.id && i.type === item.type));
      const updated = [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, 5);
      localStorage.setItem("recentlyViewed", JSON.stringify(updated));
      return updated;
    });
  };

  return { recentItems: items, addToRecent };
}
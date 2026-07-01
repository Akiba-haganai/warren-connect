import { supabase } from "@/lib/supabase/client";

export type SearchResult = {
  id: string;
  type: "user" | "post" | "product" | "accommodation";
  title: string;
  subtitle: string;
  image_url: string | null;
  link: string;
  raw: string; // original text for highlighting
};

const RECENT_SEARCH_KEY = "recent_searches";

export const searchService = {
  async search(query: string): Promise<SearchResult[]> {
    const { data, error } = await supabase.rpc("search_all", {
      search_term: query,
    });

    if (error) throw error;
    if (!data) return [];

    return (data as any[]).map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      image_url: item.image_url,
      link: item.link,
      raw: item.title + " " + item.subtitle, // for highlighting
    }));
  },

  getRecentSearches(): string[] {
    try {
      const stored = localStorage.getItem(RECENT_SEARCH_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  addRecentSearch(query: string) {
    const current = this.getRecentSearches();
    const updated = [query, ...current.filter((s) => s !== query)].slice(0, 10);
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(updated));
  },

  clearRecentSearches() {
    localStorage.removeItem(RECENT_SEARCH_KEY);
  },

  removeRecentSearch(query: string) {
    const updated = this.getRecentSearches().filter((s) => s !== query);
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(updated));
  },
};
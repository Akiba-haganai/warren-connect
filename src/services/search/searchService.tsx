import { supabase } from "@/lib/supabase/client";

export interface SearchResult {
  id: string;
  type: "user" | "post" | "product" | "accommodation";
  title: string;
  subtitle: string;
  image_url: string | null;
  link: string;
}

export const searchService = {
  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    const { data, error } = await supabase
      .rpc("search_all", { search_term: query.trim() })
      .returns<SearchResult[]>();

    if (error) throw error;
    return data || [];
  },
};
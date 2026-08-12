import { supabase } from "@/lib/supabase/client";

export interface PriceSuggestion {
  suggestedMin: number;
  suggestedMax: number;
  averagePrice: number;
  sampleSize: number;
}

export const priceEngine = {
  async suggestPriceRange(category?: string, condition?: string): Promise<PriceSuggestion | null> {
    try {
      const { data, error } = await supabase.rpc("get_product_price_stats", {
        p_category: category || null,
        p_condition: condition || null,
      });

      if (error || !data || data.length === 0) return null;

      const stat = data[0];
      if (!stat.sample_size || Number(stat.sample_size) < 3) return null;

      return {
        suggestedMin: Number(stat.suggested_min),
        suggestedMax: Number(stat.suggested_max),
        averagePrice: Number(stat.average_price),
        sampleSize: Number(stat.sample_size),
      };
    } catch {
      return null;
    }
  },
};

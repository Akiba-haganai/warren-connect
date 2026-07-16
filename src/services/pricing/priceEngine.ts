import { supabase } from "@/lib/supabase/client";

export const priceEngine = {
  async suggestPrice(category: string, condition: string) {
    const { data, error } = await supabase
      .from("products")
      .select("price")
      .eq("category", category)
      .eq("condition", condition)
      .eq("status", "sold")
      .order("sold_at", { ascending: false })
      .limit(50);

    if (error || !data || data.length < 5) return null;

    const prices = (data as Array<{ price: number | null }>).map((d) => d.price).filter((p): p is number => typeof p === "number");
    if (prices.length < 5) return null;

    prices.sort((a, b) => a - b);
    const pct = (p: number) => prices[Math.floor((prices.length - 1) * p)];

    return {
      low: pct(0.25),
      median: pct(0.5),
      high: pct(0.75),
      sampleSize: prices.length,
    };
  },
};


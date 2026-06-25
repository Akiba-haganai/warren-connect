import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";

export type Product = Tables<"products">;

export const productService = {
  async createProduct(
    seller_id: string,
    title: string,
    description: string,
    price: number,
    image_url?: string
  ) {
    const { data, error } = await supabase
      .from("products")
      .insert({ seller_id, title, description, price, image_url: image_url ?? null })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getProductById(id: string) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  /** Fetch product with seller profile */
  async getProductWithSeller(id: string) {
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !product) throw error;

    const { data: seller } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, is_verified")
      .eq("id", product.seller_id)
      .single();

    return { ...product, seller: seller ?? undefined };
  },

  async toggleStock(productId: string, inStock: boolean) {
    const { error } = await supabase
      .from("products")
      .update({ in_stock: inStock })
      .eq("id", productId);
    if (error) throw error;
  },

  async deleteProduct(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  },
};
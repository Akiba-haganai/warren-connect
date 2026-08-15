import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";

export type Product = Tables<"products">;

import { handleSupabaseError } from "@/utils/supabaseErrorHandler";

export const productService = {
  async createProduct(
    seller_id: string,
    title: string,
    description: string,
    price: number,
    has_image?: boolean,
    condition?: string,
    category?: string
  ) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    let resData: any = null;

    try {
      const { data, error } = await supabase.functions.invoke("create-product", {
        body: { title, description, price, condition, category, has_image },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (error) {
        const customMessage = error.context?.json?.error || error.message;
        if (customMessage) {
          if (customMessage.includes("community guidelines")) {
            throw new Error("Your content violates community guidelines and cannot be posted.");
          }
        }
        throw error;
      }
      resData = data;
    } catch (edgeErr: any) {
      if (edgeErr.message?.includes("community guidelines")) {
        throw edgeErr;
      }
      // Fallback: Direct database insert if edge function is unconfigured or fails
      const { data: directProduct, error: directErr } = await supabase
        .from("products")
        .insert({
          seller_id,
          title,
          description,
          price,
          condition: condition || "used_good",
          category: category || "Other",
          moderation_status: "approved",
          is_hidden: false,
        })
        .select()
        .single();

      if (directErr) handleSupabaseError(directErr);
      resData = directProduct;
    }

    return resData?.product || resData?.data || resData;
  },

  async getProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_hidden", false)
      .eq("moderation_status", "approved")
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

  async getUserProducts(userId: string) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getProductsByIds(ids: string[]) {
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .in("id", ids);

    if (error) throw error;
    return data || [];
  },

  async getProductsPaginated(limit: number, offset: number) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_hidden", false)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  },

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
    if (!productId || productId === "undefined") {
      throw new Error("Product ID is required to update stock status.");
    }
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

  async addProductImage(productId: string, imageUrl: string) {
    const { error } = await supabase
      .from("product_images")
      .insert({ product_id: productId, image_url: imageUrl });

    if (error) throw error;
  },

  async getProductImages(productId: string) {
    const { data, error } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateProduct(
    id: string,
    updates: {
      title?: string;
      description?: string;
      price?: number;
      condition?: string;
      category?: string;
      in_stock?: boolean;
      is_hidden?: boolean;
      image_url?: string;
    }
  ) {
    if (!id || id === "undefined") {
      throw new Error("Invalid product ID");
    }
    const { data, error } = await supabase
      .from("products")
      .update(updates as any)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProductImage(imageId: string) {
    const { error } = await supabase
      .from("product_images")
      .delete()
      .eq("id", imageId);
    if (error) throw error;
  },
};


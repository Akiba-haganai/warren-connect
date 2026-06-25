import { supabase } from "@/lib/supabase/client";

export const adminService = {
  async deletePost(postId: string) {
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (error) throw error;
  },

  async deleteProduct(productId: string) {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) throw error;
  },

  async deleteAccommodation(accommodationId: string) {
    const { error } = await supabase
      .from("accommodations")
      .delete()
      .eq("id", accommodationId);

    if (error) throw error;
  },

  async getUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },
};
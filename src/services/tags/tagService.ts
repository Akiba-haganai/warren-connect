import { supabase } from "@/lib/supabase/client";

export const tagService = {
  // Fetch all tags (for autocomplete)
  async getAllTags() {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Create a new tag (if not exists, handle unique constraint)
  async createTag(name: string) {
    const { data, error } = await supabase
      .from("tags")
      .insert({ name: name.trim().toLowerCase() })
      .select()
      .single();
    if (error && error.code === "23505") {
      // Tag already exists, return existing
      const { data: existing } = await supabase
        .from("tags")
        .select("*")
        .eq("name", name.trim().toLowerCase())
        .single();
      return existing;
    }
    if (error) throw error;
    return data;
  },

  // Tag a post
  async addTagToPost(postId: string, tagId: string) {
    await supabase.from("post_tags").insert({ post_id: postId, tag_id: tagId });
  },

  async removeTagFromPost(postId: string, tagId: string) {
    await supabase.from("post_tags").delete().eq("post_id", postId).eq("tag_id", tagId);
  },

  // Tag a product
  async addTagToProduct(productId: string, tagId: string) {
    await supabase.from("product_tags").insert({ product_id: productId, tag_id: tagId });
  },

  async removeTagFromProduct(productId: string, tagId: string) {
    await supabase.from("product_tags").delete().eq("product_id", productId).eq("tag_id", tagId);
  },

  // Tag an accommodation
  async addTagToAccommodation(accommodationId: string, tagId: string) {
    await supabase.from("accommodation_tags").insert({ accommodation_id: accommodationId, tag_id: tagId });
  },

  async removeTagFromAccommodation(accommodationId: string, tagId: string) {
    await supabase.from("accommodation_tags").delete().eq("accommodation_id", accommodationId).eq("tag_id", tagId);
  },
  async getTagsForPost(postId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("post_tags")
    .select("tags(name)")
    .eq("post_id", postId);
  if (error) return [];
  return data?.map((t: any) => t.tags?.name).filter(Boolean) || [];
},
async getTagsForProduct(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("product_tags")
    .select("tags(name)")
    .eq("product_id", productId);
  if (error) return [];
  return data?.map((t: any) => t.tags?.name).filter(Boolean) || [];
},
async getTagsForAccommodation(accommodationId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("accommodation_tags")
    .select("tags(name)")
    .eq("accommodation_id", accommodationId);
  if (error) return [];
  return data?.map((t: any) => t.tags?.name).filter(Boolean) || [];
},
};
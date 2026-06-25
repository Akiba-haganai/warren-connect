import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";
import { storageService } from "@/services/storage/storageService";

export type Profile = Tables<"profiles">;

export const profileService = {
  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;

    return data;
  },

  async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async createProfile(profile: Profile): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .insert(profile)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async uploadAvatar(
    userId: string,
    file: File
  ): Promise<string> {
    const url = await storageService.uploadFile(
      "avatars",
      file,
      userId
    );

    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_url: url,
      })
      .eq("id", userId);

    if (error) throw error;

    return url;
  },

  async uploadCover(
    userId: string,
    file: File
  ): Promise<string> {
    const url = await storageService.uploadFile(
      "covers",
      file,
      userId
    );

    const { error } = await supabase
      .from("profiles")
      .update({
        cover_photo_url: url,
      })
      .eq("id", userId);

    if (error) throw error;

    return url;
  },

  async getUserPosts(userId: string) {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) throw error;

    return data;
  },

  async getUserProducts(userId: string) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) throw error;

    return data;
  },

  async getUserAccommodations(userId: string) {
    const { data, error } = await supabase
      .from("accommodations")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) throw error;

    return data;
  },
};
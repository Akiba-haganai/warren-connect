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

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
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

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const { publicUrl: url, thumbUrl } = await storageService.uploadFile(
      "avatars",
      file,
      userId,
      true
    );
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url, avatar_thumb: thumbUrl })
      .eq("id", userId);
    if (error) throw error;
    return url;
  },

  async uploadCover(userId: string, file: File): Promise<string> {
    const { publicUrl: url } = await storageService.uploadFile(
      "covers",
      file,
      userId,
      true
    );
    const { error } = await supabase
      .from("profiles")
      .update({ cover_photo_url: url })
      .eq("id", userId);
    if (error) throw error;
    return url;
  },

  async getUserPosts(userId: string) {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
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
    return data;
  },

  // ✅ Fixed: uses atomic RPC instead of raw()
  async recordLandlordReply(landlordId: string, messageCreatedAt: string) {
    const responseTime = Date.now() - new Date(messageCreatedAt).getTime();
    if (responseTime < 0 || responseTime > 86_400_000) return; // ignore >24h

    const { error } = await supabase.rpc("increment_response_metrics", {
      p_user_id: landlordId,
      p_response_time_ms: responseTime,
    });
    if (error) throw error;
  },

  async getUserAccommodations(userId: string) {
    const { data, error } = await supabase
      .from("accommodations")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  // ---- Deletion Requests ----

  async requestAccountDeletion(userId: string, reason?: string) {
    const { data, error } = await supabase
      .from("deletion_requests")
      .insert({ user_id: userId, reason })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getDeletionRequestStatus(userId: string) {
    const { data, error } = await supabase
      .from("deletion_requests")
      .select("status")
      .eq("user_id", userId)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data?.status ?? null;
  },
};
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";

export type Accommodation = Tables<"accommodations">;
export type Profile = Tables<"profiles">;

export const accommodationService = {
  async createAccommodation(
    owner_id: string,
    title: string,
    description: string,
    location: string,
    monthly_rent: number,
    image_url?: string
  ) {
    const { data, error } = await supabase
      .from("accommodations")
      .insert({
        owner_id,
        title,
        description,
        location,
        monthly_rent,
        image_url: image_url ?? null,
        status: "available", // new listings start as available
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAccommodations() {
    const { data, error } = await supabase
      .from("accommodations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getAccommodationById(id: string) {
    const { data, error } = await supabase
      .from("accommodations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  /** Fetch single accommodation with landlord profile */
  async getAccommodationWithLandlord(id: string) {
    const { data: acc, error } = await supabase
      .from("accommodations")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !acc) throw error || new Error("Not found");

    // Fetch landlord profile using owner_id
    const { data: landlord } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, is_verified, is_landlord")
      .eq("id", acc.owner_id)
      .single();

    return { ...acc, landlord: landlord ?? undefined };
  },

  /** Get all accommodations for a specific landlord */
  async getMyAccommodations(ownerId: string): Promise<Accommodation[]> {
    const { data, error } = await supabase
      .from("accommodations")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateAccommodationStatus(
    id: string,
    status: "available" | "rented" | "hidden"
  ) {
    const { error } = await supabase
      .from("accommodations")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteAccommodation(id: string) {
    const { error } = await supabase
      .from("accommodations")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
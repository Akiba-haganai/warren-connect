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
  // Upload additional image for an accommodation
async addImage(accommodationId: string, imageUrl: string) {
  const { error } = await supabase
    .from("accommodation_images")
    .insert({ accommodation_id: accommodationId, image_url: imageUrl });
  if (error) throw error;
},

// Get all images for an accommodation
async getImages(accommodationId: string) {
  const { data, error } = await supabase
    .from("accommodation_images")
    .select("*")
    .eq("accommodation_id", accommodationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
},

// Delete an image
async deleteImage(imageId: string) {
  const { error } = await supabase
    .from("accommodation_images")
    .delete()
    .eq("id", imageId);
  if (error) throw error;
},

// Set amenities (overwrite entire list)
async setAmenities(accommodationId: string, amenities: string[]) {
  // Remove existing
  await supabase.from("accommodation_amenities").delete().eq("accommodation_id", accommodationId);
  // Insert new
  if (amenities.length > 0) {
    const rows = amenities.map(a => ({ accommodation_id: accommodationId, amenity: a }));
    const { error } = await supabase.from("accommodation_amenities").insert(rows);
    if (error) throw error;
  }
},

// Get amenities for an accommodation
async getAmenities(accommodationId: string) {
  const { data, error } = await supabase
    .from("accommodation_amenities")
    .select("amenity")
    .eq("accommodation_id", accommodationId);
  if (error) throw error;
  return (data || []).map(r => r.amenity);
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
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
    image_url?: string,
    listing_type: string = "property",
    parent_id?: string,
    capacity?: number
  ) {
    // ---- FREE TIER LIMIT (only for parent properties) ----
    if (listing_type === "property") {
      const { count, error: countError } = await supabase
        .from("accommodations")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", owner_id)
        .eq("listing_type", "property");

      if (countError) throw countError;
      if (count !== null && count >= 2) {
        throw new Error("You can only create up to 2 properties on the free plan.");
      }
    }

    const { data, error } = await supabase
      .from("accommodations")
      .insert({
        owner_id,
        title,
        description,
        location,
        monthly_rent,
        image_url: image_url ?? null,
        status: "available",
        listing_type,
        parent_id: parent_id ?? null,
        capacity: capacity ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    // Auto‑set the owner as a landlord
    await supabase
      .from("profiles")
      .update({ is_landlord: true })
      .eq("id", owner_id);

    return data;
  },

  async getAccommodations() {
    const { data, error } = await supabase
      .from("accommodations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
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

  async getAccommodationsByIds(ids: string[]) {
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from("accommodations")
      .select("*")
      .in("id", ids);
    if (error) throw error;
    return data || [];
  },

  async getAccommodationWithLandlord(id: string) {
    const { data: acc, error } = await supabase
      .from("accommodations")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !acc) throw error || new Error("Not found");

    const { data: landlord } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, is_verified, is_landlord")
      .eq("id", acc.owner_id)
      .single();

    return { ...acc, landlord: landlord ?? undefined };
  },

  async addImage(accommodationId: string, imageUrl: string) {
    const { error } = await supabase
      .from("accommodation_images")
      .insert({ accommodation_id: accommodationId, image_url: imageUrl });
    if (error) throw error;
  },

  async getImages(accommodationId: string) {
    const { data, error } = await supabase
      .from("accommodation_images")
      .select("*")
      .eq("accommodation_id", accommodationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async deleteImage(imageId: string) {
    const { error } = await supabase
      .from("accommodation_images")
      .delete()
      .eq("id", imageId);
    if (error) throw error;
  },

  async setAmenities(accommodationId: string, amenities: string[]) {
    await supabase.from("accommodation_amenities").delete().eq("accommodation_id", accommodationId);
    if (amenities.length > 0) {
      const rows = amenities.map((a) => ({ accommodation_id: accommodationId, amenity: a }));
      const { error } = await supabase.from("accommodation_amenities").insert(rows);
      if (error) throw error;
    }
  },

  async getAmenities(accommodationId: string) {
    const { data, error } = await supabase
      .from("accommodation_amenities")
      .select("amenity")
      .eq("accommodation_id", accommodationId);
    if (error) throw error;
    return (data || []).map((r) => r.amenity);
  },

  async getMyAccommodations(ownerId: string): Promise<Accommodation[]> {
    const { data, error } = await supabase
      .from("accommodations")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateAccommodationStatus(id: string, status: "available" | "rented" | "hidden") {
    const { error } = await supabase
      .from("accommodations")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteAccommodation(id: string) {
    const { error } = await supabase.from("accommodations").delete().eq("id", id);
    if (error) throw error;
  },

  async getAccommodationsPaginated(limit: number, offset: number) {
    const { data, error } = await supabase
      .from("accommodations")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  },

  async getLandlordStats(ownerId: string) {
    const { data: accommodations, error } = await supabase
      .from("accommodations")
      .select("id, title, monthly_rent, status")
      .eq("owner_id", ownerId);

    if (error) throw error;
    const list = accommodations || [];

    // Count enquiries from notifications
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("type", "accommodation_interest")
      .in("link", list.map((a) => `/accommodation/${a.id}`));

    return {
      accommodations: list,
      totalEnquiries: count || 0,
    };
  },

  // ---- Rooms & parent-child ----
  async getRooms(propertyId: string) {
    const { data, error } = await supabase
      .from("accommodations")
      .select("*")
      .eq("parent_id", propertyId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // ---- Collaborators ----
  async addCollaborator(accommodationId: string, userId: string, role: string = "member") {
    const { error } = await supabase
      .from("accommodation_collaborators")
      .insert({ accommodation_id: accommodationId, user_id: userId, role });
    if (error) throw error;
  },

  async removeCollaborator(accommodationId: string, userId: string) {
    const { error } = await supabase
      .from("accommodation_collaborators")
      .delete()
      .match({ accommodation_id: accommodationId, user_id: userId });
    if (error) throw error;
  },

  async getCollaborators(accommodationId: string) {
    const { data, error } = await supabase
      .from("accommodation_collaborators")
      .select("user_id, role, profiles(id, full_name, avatar_url)")
      .eq("accommodation_id", accommodationId);
    if (error) throw error;
    return data || [];
  },
};


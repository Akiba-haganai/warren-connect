import { supabase } from "@/lib/supabase/client";
import { ZAMBIA_LOCATIONS } from "@/constants/locations";

export interface LocationItem {
  id?: string;
  name: string;
  province?: string;
  city?: string;
  is_active?: boolean;
}

export const locationService = {
  /** Fetch all locations from Supabase database with fallback to preset */
  async getLocations(): Promise<string[]> {
    try {
      const { data, error } = await (supabase.from as any)("locations")
        .select("name")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error || !data || data.length === 0) {
        return Array.from(ZAMBIA_LOCATIONS);
      }

      const dbNames = data.map((d: any) => d.name);
      return Array.from(new Set([...dbNames, ...ZAMBIA_LOCATIONS]));
    } catch {
      return Array.from(ZAMBIA_LOCATIONS);
    }
  },

  /** Get all detailed location items for Admin management */
  async getAllLocationsAdmin(): Promise<LocationItem[]> {
    try {
      const { data, error } = await (supabase.from as any)("locations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) {
        return ZAMBIA_LOCATIONS.map((loc) => ({
          id: loc,
          name: loc,
          province: loc.startsWith("Lusaka") ? "Lusaka" : "Copperbelt",
          city: loc.startsWith("Lusaka") ? "Lusaka" : loc.startsWith("Kitwe") ? "Kitwe" : "Ndola",
          is_active: true,
        }));
      }

      return data as LocationItem[];
    } catch {
      return ZAMBIA_LOCATIONS.map((loc) => ({
        id: loc,
        name: loc,
        province: loc.startsWith("Lusaka") ? "Lusaka" : "Copperbelt",
        city: loc.startsWith("Lusaka") ? "Lusaka" : loc.startsWith("Kitwe") ? "Kitwe" : "Ndola",
        is_active: true,
      }));
    }
  },

  /** Admin: Add new location */
  async createLocation(name: string, province = "Lusaka", city = "Lusaka") {
    const { data, error } = await (supabase.from as any)("locations")
      .insert({
        name: name.trim(),
        province: province.trim(),
        city: city.trim(),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Admin: Delete location */
  async deleteLocation(id: string) {
    const { error } = await (supabase.from as any)("locations")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};

import { supabase } from "@/lib/supabase/client";

export const listingInterestService = {
  async join(accommodationId: string, userId: string, note?: string) {
    const { data, error } = await supabase
      .from("listing_interests")
      .insert({ accommodation_id: accommodationId, user_id: userId, note })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async withdraw(interestId: string) {
    const { data, error } = await supabase
      .from("listing_interests")
      .update({ status: "withdrawn" })
      .eq("id", interestId)
      .select();

    if (error) throw error;
    if (!data?.length) throw new Error("Could not withdraw — check permissions.");
  },

  async getMyPosition(accommodationId: string, userId: string) {
    const { data: mine, error: mineErr } = await supabase
      .from("listing_interests")
      .select("*")
      .eq("accommodation_id", accommodationId)
      .eq("user_id", userId)
      .in("status", ["queued", "shortlisted", "filled"])
      .maybeSingle();

    if (mineErr) throw mineErr;
    if (!mine) return null;

    if (mine.status !== "queued") return { entry: mine, position: null };

    const { count, error: countErr } = await supabase
      .from("listing_interests")
      .select("*", { count: "exact", head: true })
      .eq("accommodation_id", accommodationId)
      .eq("status", "queued")
      .lt("created_at", mine.created_at);

    if (countErr) throw countErr;

    return { entry: mine, position: (count ?? 0) + 1 };
  },

  async getQueueForListing(accommodationId: string) {
    const { data, error } = await supabase
      .from("listing_interests")
      .select(
        "*, profile:profiles(id, full_name, avatar_url, is_verified, avg_rating)"
      )
      .eq("accommodation_id", accommodationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async shortlist(interestId: string) {
    const { data, error } = await supabase
      .from("listing_interests")
      .update({ status: "shortlisted" })
      .eq("id", interestId)
      .select();

    if (error) throw error;
    if (!data?.length) throw new Error("Could not shortlist — check permissions.");
  },

  async closeQueue(accommodationId: string) {
    const { error } = await supabase
      .from("listing_interests")
      .update({ status: "filled" })
      .eq("accommodation_id", accommodationId)
      .in("status", ["queued", "shortlisted"]);

    if (error) throw error;
  },
};


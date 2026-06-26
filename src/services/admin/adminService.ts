import { supabase } from "@/lib/supabase/client";

export const adminService = {
  // ---- Reports ----
  async getReports() {
    // Fetch all reports without a foreign‑key join
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    // Manually fetch reporter profiles
    const reporterIds = [...new Set(data.map((r) => r.reporter_id))];
    const { data: reporters } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", reporterIds);

    const reporterMap = new Map(reporters?.map((p) => [p.id, p]) || []);

    return data.map((report) => ({
      ...report,
      reporter: reporterMap.get(report.reporter_id) || null,
    }));
  },

  async updateReportStatus(reportId: string, status: "reviewed" | "resolved") {
    const { error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", reportId);
    if (error) throw error;
  },

  // ---- Users ----
  async getUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async toggleBanUser(userId: string, banned: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: banned })
      .eq("id", userId);
    if (error) throw error;
  },

  // ---- Content hiding ----
  async hidePost(postId: string, hide: boolean) {
    const { error } = await supabase
      .from("posts")
      .update({ is_hidden: hide })
      .eq("id", postId);
    if (error) throw error;
  },

  async hideProduct(productId: string, hide: boolean) {
    const { error } = await supabase
      .from("products")
      .update({ is_hidden: hide })
      .eq("id", productId);
    if (error) throw error;
  },

  async hideAccommodation(accommodationId: string, hide: boolean) {
    const { error } = await supabase
      .from("accommodations")
      .update({ is_hidden: hide })
      .eq("id", accommodationId);
    if (error) throw error;
  },

  // ---- Bulk content fetching for moderation ----
  async getReportedPosts() {
    const { data, error } = await supabase
      .from("reports")
      .select("content_id, posts(*)")
      .eq("content_type", "post")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getReportedProducts() {
    const { data, error } = await supabase
      .from("reports")
      .select("content_id, products(*)")
      .eq("content_type", "product")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getReportedAccommodations() {
    const { data, error } = await supabase
      .from("reports")
      .select("content_id, accommodations(*)")
      .eq("content_type", "accommodation")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async deletePost(postId: string) {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) throw error;
  },

  async deleteProduct(productId: string) {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) throw error;
  },

  async deleteAccommodation(accommodationId: string) {
    const { error } = await supabase.from("accommodations").delete().eq("id", accommodationId);
    if (error) throw error;
  },
};
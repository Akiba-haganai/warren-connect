import { supabase } from "@/lib/supabase/client";

export const adminService = {
  async updateContentFeatured(type: string, id: string, featured: boolean) {
    const table = type === "post" ? "posts" : type === "product" ? "products" : "accommodations";
    const { data, error } = await supabase.from(table).update({ featured }).eq("id", id).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Update blocked — RLS or permissions.");
  },

  async getReports() {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!data) return [];

    const reporterIds = [...new Set(data.map((r) => r.reporter_id))];
    const { data: reporters } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", reporterIds);
    const reporterMap = new Map(reporters?.map((p) => [p.id, p]) || []);
    return data.map((report) => ({ ...report, reporter: reporterMap.get(report.reporter_id) || null }));
  },

  async updateReportStatus(reportId: string, status: "reviewed" | "resolved") {
    const { data, error } = await supabase.from("reports").update({ status }).eq("id", reportId).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Report update blocked — RLS or permissions.");
  },

  async getUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async toggleBanUser(userId: string, banned: boolean) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ is_banned: banned })
      .eq("id", userId)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Ban update blocked — check RLS.");
  },

  async hidePost(postId: string, hide: boolean) {
    const { data, error } = await supabase.from("posts").update({ is_hidden: hide }).eq("id", postId).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Hide post blocked — RLS or permissions.");
  },

  async hideProduct(productId: string, hide: boolean) {
    const { data, error } = await supabase.from("products").update({ is_hidden: hide }).eq("id", productId).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Hide product blocked — RLS or permissions.");
  },

  async hideAccommodation(accommodationId: string, hide: boolean) {
    const { data, error } = await supabase.from("accommodations").update({ is_hidden: hide }).eq("id", accommodationId).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Hide accommodation blocked — RLS or permissions.");
  },

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
    const { data, error } = await supabase.from("posts").delete().eq("id", postId).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Delete post blocked — RLS or permissions.");
  },

  async deleteProduct(productId: string) {
    const { data, error } = await supabase.from("products").delete().eq("id", productId).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Delete product blocked — RLS or permissions.");
  },

  async deleteAccommodation(accommodationId: string) {
    const { data, error } = await supabase.from("accommodations").delete().eq("id", accommodationId).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Delete accommodation blocked — RLS or permissions.");
  },

  async getStats(): Promise<{
    totalUsers: number; totalProducts: number; totalAccommodations: number;
    pendingReports: number; pendingVerifications: number;
    recentUsers: any[];
  }> {
    const [
      { count: totalUsers },
      { count: totalProducts },
      { count: totalAccommodations },
      { count: pendingReports },
      { count: pendingVerifications },
      { data: recentUsers },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("accommodations").select("*", { count: "exact", head: true }),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(5),
    ]);
    return {
      totalUsers: totalUsers ?? 0,
      totalProducts: totalProducts ?? 0,
      totalAccommodations: totalAccommodations ?? 0,
      pendingReports: pendingReports ?? 0,
      pendingVerifications: pendingVerifications ?? 0,
      recentUsers: recentUsers || [],
    };
  },

  async getAllPosts(search = "") {
    let query = supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50);
    if (search) query = query.ilike("content", `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getAllProducts(search = "") {
    let query = supabase.from("products").select("*").order("created_at", { ascending: false }).limit(50);
    if (search) query = query.ilike("title", `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getAllAccommodations(search = "") {
    let query = supabase.from("accommodations").select("*").order("created_at", { ascending: false }).limit(50);
    if (search) query = query.ilike("title", `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async updateUserRole(userId: string, field: string, value: boolean) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ [field]: value } as any)
      .eq("id", userId)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Role update blocked — check RLS.");
  },

  async createTag(name: string) {
    const { data, error } = await supabase
      .from("tags")
      .insert({ name: name.trim().toLowerCase() })
      .select()
      .single();
    if (error && error.code === "23505") {
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

  async deleteTag(tagId: string) {
    const { data, error } = await supabase.from("tags").delete().eq("id", tagId).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Delete tag blocked — RLS or permissions.");
  },

  async getAllTags() {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getPasswordResetRequests() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .ilike("title", "%password reset%")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async markResetHandled(notificationId: string) {
    const { data, error } = await supabase.from("notifications").delete().eq("id", notificationId).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Mark reset failed — RLS or permissions.");
  },
};
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";

export type VerificationRequest = Tables<"verification_requests">;

export const verificationService = {
  /** Submit a new verification request */
  async submitRequest(userId: string, fullName: string, idDocumentUrl: string, reason?: string) {
    const { data, error } = await supabase
      .from("verification_requests")
      .insert({
        user_id: userId,
        full_name: fullName,
        id_document_url: idDocumentUrl,
        reason: reason ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Get all verification requests (admin) */
  async getAllRequests(): Promise<VerificationRequest[]> {
    const { data, error } = await supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /** Get user's own verification requests */
  async getMyRequests(userId: string): Promise<VerificationRequest[]> {
    const { data, error } = await supabase
      .from("verification_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /** Approve a verification request (admin) */
  async approveRequest(requestId: string, reviewerId: string, userId: string) {
    const { error } = await supabase.rpc("approve_verification", {
      p_request_id: requestId,
      p_reviewer_id: reviewerId,
      p_user_id: userId,
    });

    if (error) throw error;
  },

  /** Reject a verification request (admin) */
  async rejectRequest(requestId: string, reviewerId: string) {
    const { error } = await supabase
      .from("verification_requests")
      .update({
        status: "rejected",
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) throw error;
  },
};
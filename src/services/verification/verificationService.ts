import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";

export type VerificationRequest = Tables<"verification_requests">;

export const verificationService = {
  /** Submit a new verification request with dual ID & NRC documents */
  async submitRequest(
    userId: string,
    fullName: string,
    idDocumentUrl: string,
    nrcDocumentUrl?: string,
    studentIdNumber?: string,
    nrcNumber?: string,
    reason?: string
  ) {
    const payload: any = {
      user_id: userId,
      full_name: fullName,
      id_document_url: idDocumentUrl,
      reason: reason ?? null,
      status: "pending",
    };

    if (nrcDocumentUrl) payload.nrc_document_url = nrcDocumentUrl;
    if (studentIdNumber) payload.student_id_number = studentIdNumber;
    if (nrcNumber) payload.nrc_number = nrcNumber;

    const { data, error } = await supabase
      .from("verification_requests")
      .insert(payload)
      .select()
      .single();

    if (error) {
      // Fallback if specific columns fail
      const fallbackPayload = {
        user_id: userId,
        full_name: fullName,
        id_document_url: idDocumentUrl,
        reason: [reason, studentIdNumber ? `Student ID: ${studentIdNumber}` : null, nrcNumber ? `NRC: ${nrcNumber}` : null].filter(Boolean).join(" | "),
        status: "pending",
      };
      const { data: fbData, error: fbError } = await supabase
        .from("verification_requests")
        .insert(fallbackPayload)
        .select()
        .single();
      if (fbError) throw fbError;
      return fbData;
    }
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
    const { error: rpcError } = await supabase.rpc("approve_verification", {
      p_request_id: requestId,
      p_reviewer_id: reviewerId,
      p_user_id: userId,
    });

    if (rpcError) {
      // Fallback: If RPC fails, update the table manually
      const { error: reqError } = await supabase
        .from("verification_requests")
        .update({
          status: "approved",
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (reqError) throw reqError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", userId);

      if (profileError) throw profileError;
    }
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

  // -------- Roadmap additions (Verified Seller Tiers) --------

  async requestPhoneOtp(phone: string) {
    const { error } = await supabase.functions.invoke("send-otp", { body: { phone } });
    if (error) throw error;
  },

  async confirmPhoneOtp(userId: string, phone: string, code: string) {
    const { data, error } = await supabase.functions.invoke("verify-otp", {
      body: { phone, code },
    });

    if (error || !data?.valid) throw new Error("Invalid code");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        verification_tier: "phone",
        phone_verified_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) throw updateError;
  },

  async submitIdVerification(userId: string, documentUrl: string, tier: "id" | "business" = "id") {
    // Additive approach: insert into the existing verification_requests table.
    // If your table columns differ, adjust mapping here.
    const payload: Record<string, any> = {
      user_id: userId,
      requested_tier: tier,
      document_url: documentUrl,
      status: "pending",
    };

    const { error } = await supabase.from("verification_requests").insert(payload);
    if (error) throw error;
  },
};


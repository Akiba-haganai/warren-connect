import { supabase } from "@/lib/supabase/client";

export interface RecoveryQuestion {
  id: number;
  type: string;
  question: string;
  options: string[];
}

export interface SubmittedAnswer {
  type: string;
  selected_value: string;
}

export const recoveryService = {
  async getChallenge(email: string): Promise<{ success: boolean; questions?: RecoveryQuestion[]; message?: string }> {
    const { data, error } = await (supabase.rpc as any)("get_password_recovery_challenge", {
      p_email: email.trim(),
    });
    if (error) throw error;
    return data;
  },

  async verifyChallenge(
    email: string,
    answers: SubmittedAnswer[]
  ): Promise<{ success: boolean; score?: number; request_id?: string; message?: string }> {
    const { data, error } = await (supabase.rpc as any)("verify_password_recovery_challenge", {
      p_email: email.trim(),
      p_answers: answers,
    });
    if (error) throw error;
    return data;
  },

  async getRecoveryRequests() {
    const { data, error } = await supabase
      .from("password_recovery_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async adminApproveReset(requestId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const { data, error } = await supabase.functions.invoke("admin-approve-password-reset", {
      body: { request_id: requestId, action: "approve" },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (error) {
      const customMessage = error.context?.json?.error || error.message;
      throw new Error(customMessage);
    }
    return data;
  },

  async adminRejectReset(requestId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const { data, error } = await supabase.functions.invoke("admin-approve-password-reset", {
      body: { request_id: requestId, action: "reject" },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (error) {
      const customMessage = error.context?.json?.error || error.message;
      throw new Error(customMessage);
    }
    return data;
  },
};

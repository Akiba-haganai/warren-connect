import { supabase } from "@/lib/supabase/client";

export const recoveryService = {
  async requestReset(email: string): Promise<{ success: boolean; message?: string }> {
    const { data, error } = await (supabase.rpc as any)("request_password_reset", {
      p_email: email.trim(),
    });
    if (error) throw error;
    return data;
  },

  async getRecoveryRequests() {
    const { data, error } = await (supabase.from as any)("password_recovery_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async adminApproveReset(requestId: string) {
    // 1. Fetch the request to get the target user's email
    const { data: req, error: fetchErr } = await (supabase.from as any)("password_recovery_requests")
      .select("id, email, status")
      .eq("id", requestId)
      .single();

    if (fetchErr || !req?.email) {
      throw new Error("Could not find recovery request email in database.");
    }

    // 2. Dispatch password reset email via native Supabase Auth mailer
    const siteUrl = window.location.origin;
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(req.email as string, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (resetErr) {
      console.error("Supabase resetPasswordForEmail raw error:", resetErr);
      const msg = resetErr.message || (resetErr as any).error_description || (resetErr as any).msg || JSON.stringify(resetErr);
      throw new Error(`Supabase Auth Mailer: ${msg}`);
    }

    // 3. Mark request as approved in database
    const { error: updateErr } = await (supabase.from as any)("password_recovery_requests")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (updateErr) throw updateErr;

    return { success: true };
  },

  async adminRejectReset(requestId: string) {
    const { error: updateErr } = await (supabase.from as any)("password_recovery_requests")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (updateErr) throw updateErr;

    return { success: true };
  }
};

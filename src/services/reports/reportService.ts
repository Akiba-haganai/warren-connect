import { supabase } from "@/lib/supabase/client";

export const reportService = {
  async submitReport(reporterId: string, contentType: string, contentId: string, reason: string, contentOwnerId?: string) {
    const payload: any = { reporter_id: reporterId, content_type: contentType, content_id: contentId, reason };
    if (contentOwnerId) {
      payload.content_owner_id = contentOwnerId;
    }
    const { error } = await supabase.from("reports").insert(payload);
    if (error) throw error;
  }
};
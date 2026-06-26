import { supabase } from "@/lib/supabase/client";

export const reportService = {
  async submitReport(reporterId: string, contentType: string, contentId: string, reason: string) {
    const { error } = await supabase
      .from("reports")
      .insert({ reporter_id: reporterId, content_type: contentType, content_id: contentId, reason });
    if (error) throw error;
  }
};
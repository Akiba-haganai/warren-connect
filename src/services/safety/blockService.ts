import { supabase } from "@/lib/supabase/client";

export const blockService = {
  async blockUser(blockerId: string, blockedId: string) {
    const { error } = await supabase.from("blocked_users").insert({ blocker_id: blockerId, blocked_id: blockedId });
    if (error && error.code !== '23505') throw error; // ignore duplicates
  },
  async unblockUser(blockerId: string, blockedId: string) {
    const { error } = await supabase.from("blocked_users").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
    if (error) throw error;
  },
  async getBlockedUsers(userId: string): Promise<string[]> {
    const { data } = await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", userId);
    return data?.map(r => r.blocked_id) ?? [];
  },
  async isBlocked(userId: string, targetId: string): Promise<boolean> {
    const { data } = await supabase.from("blocked_users").select("id").eq("blocker_id", userId).eq("blocked_id", targetId).maybeSingle();
    return !!data;
  }
};
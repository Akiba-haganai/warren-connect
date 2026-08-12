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
  },
  async muteUser(muterId: string, mutedId: string) {
    const { error } = await supabase.from("user_mutes").insert({ muter_id: muterId, muted_id: mutedId });
    if (error && error.code !== '23505') throw error;
  },
  async unmuteUser(muterId: string, mutedId: string) {
    const { error } = await supabase.from("user_mutes").delete().eq("muter_id", muterId).eq("muted_id", mutedId);
    if (error) throw error;
  },
  async getMutedUsers(userId: string): Promise<string[]> {
    const { data } = await supabase.from("user_mutes").select("muted_id").eq("muter_id", userId);
    return data?.map(r => r.muted_id) ?? [];
  }
};
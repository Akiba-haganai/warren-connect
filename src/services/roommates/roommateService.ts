import { supabase } from "@/lib/supabase/client";

export const roommateService = {
  async likeUser(likerId: string, likedId: string) {
    const { error } = await supabase
      .from("roommate_likes")
      .insert({ liker_id: likerId, liked_id: likedId });
    if (error && error.code !== "23505") throw error; // ignore duplicate
  },

  async unlikeUser(likerId: string, likedId: string) {
    const { error } = await supabase
      .from("roommate_likes")
      .delete()
      .eq("liker_id", likerId)
      .eq("liked_id", likedId);
    if (error) throw error;
  },

  async hasLiked(likerId: string, likedId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("roommate_likes")
      .select("id")
      .eq("liker_id", likerId)
      .eq("liked_id", likedId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  },

  async checkMutual(user1: string, user2: string): Promise<boolean> {
    const [a, b] = await Promise.all([
      this.hasLiked(user1, user2),
      this.hasLiked(user2, user1),
    ]);
    return a && b;
  },

  async getNewMatchesCount(userId: string): Promise<number> {
    // People who liked you that you haven't liked back yet
    const { data, error } = await supabase
      .from("roommate_likes")
      .select("liker_id")
      .eq("liked_id", userId);
    if (error || !data) return 0;

    const likerIds = data.map((l) => l.liker_id);
    if (!likerIds.length) return 0;

    // Check which of those you haven't liked back
    const { data: myLikes } = await supabase
      .from("roommate_likes")
      .select("liked_id")
      .eq("liker_id", userId)
      .in("liked_id", likerIds);

    const likedBackIds = new Set((myLikes || []).map((l) => l.liked_id));
    return likerIds.filter((id) => !likedBackIds.has(id)).length;
  },
};
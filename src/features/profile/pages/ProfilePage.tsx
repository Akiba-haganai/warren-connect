import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { postService, type FeedPost } from "@/services/posts/postService";
import ProfileHeader from "@/features/profile/components/ProfileHeader";
import ProfileBio from "@/features/profile/components/ProfileBio";
import ProfileInfo from "@/features/profile/components/ProfileInfo";
import MyListings from "@/features/profile/components/MyListings";
import ReferralCodeCard from "@/features/profile/components/ReferralCodeCard";
import VerificationBanner from "@/features/profile/components/VerificationBanner";
import ProfileCompletionMeter from "@/features/profile/components/ProfileCompletionMeter";
import RoommatePreferencesCard from "@/features/profile/components/RoommatePreferencesCard";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
    if (!user) return;
    postService.getFeed().then((all) =>
      setPosts(all.filter((p) => p.user_id === user.id))
    );
  }, [user]);

  if (!user || !profile) return null;

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <ProfileHeader uploading={uploading} setUploading={setUploading} />

      <div className="flex justify-end px-4 mt-2">
        <button
          onClick={signOut}
          className="btn-ghost text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          Sign out
        </button>
      </div>

      <ProfileInfo />

      <div className="mt-2 px-4">
        <ProfileBio />
      </div>

      <ProfileCompletionMeter />

      <VerificationBanner />

      <ReferralCodeCard />

      {/* Roommate preferences card (toggle + detailed preferences) */}
      <RoommatePreferencesCard />

      <MyListings />

      <div className="divider" />

      <div className="px-4">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Posts ({posts.length})
        </h2>
        {posts.length === 0 ? (
          <div className="rounded-xl py-10 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No posts yet — share something on the feed</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <div key={post.id} className="card p-4">
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>{post.content}</p>
                {post.image_url && (
                  <img src={post.image_url} alt="Post" className="mt-3 rounded-xl w-full object-cover" style={{ maxHeight: 300 }} loading="lazy" />
                )}
                <div className="flex justify-end mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {post.created_at && (
                    <span>{new Date(post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-20" />
    </div>
  );
}
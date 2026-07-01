import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { supabase } from "@/lib/supabase/client";
import { postService, type FeedPost } from "@/services/posts/postService";
import { reviewService } from "@/services/reviews/reviewService";
import ProfileHeader from "@/features/profile/components/ProfileHeader";
import ProfileBio from "@/features/profile/components/ProfileBio";
import ProfileInfo from "@/features/profile/components/ProfileInfo";
import MyListings from "@/features/profile/components/MyListings";
import ReferralCodeCard from "@/features/profile/components/ReferralCodeCard";
import VerificationStatusBanner from "@/features/profile/components/VerificationStatusBanner";
import ProfileCompletionMeter from "@/features/profile/components/ProfileCompletionMeter";
import RoommatePreferencesCard from "@/features/profile/components/RoommatePreferencesCard";
import DeleteAccountButton from "@/features/profile/components/DeleteAccountButton";
import { Shield, LogOut, Loader2, Star, Clock } from "lucide-react";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [responseTimeText, setResponseTimeText] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const [reviews, avg] = await Promise.all([
        reviewService.getUserReviews(user.id),
        reviewService.getUserAverageRating(user.id),
      ]);
      if (cancelled) return;
      setRecentReviews(reviews.slice(0, 3));
      setAvgRating(avg);
      setReviewCount(reviews.length);
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!profile) return;
    if (profile.response_count && profile.response_count > 0) {
      const avgMs = (profile.total_response_time_ms ?? 0) / profile.response_count;
      const mins = Math.round(avgMs / 60000);
      setResponseTimeText(mins > 0 ? `Responds in ~${mins} min` : "Responds quickly");
    } else {
      setResponseTimeText(null);
    }
  }, [profile?.response_count, profile?.total_response_time_ms]);

  if (!user || !profile) return null;

  const isAdmin = profile.is_admin;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      localStorage.clear();
      await supabase.auth.signOut();
      useAuthStore.setState({ user: null, session: null, profile: null, loading: false });
      navigate("/login", { replace: true });
    } catch {
      window.location.href = "/login";
    } finally {
      setSigningOut(false);
    }
  };

  const handleGoToAdmin = () => {
    try { navigate("/admin"); } catch { window.location.href = "/admin"; }
  };

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <ProfileHeader uploading={uploading} setUploading={setUploading} />

      <div className="px-4 pt-10">
        <ProfileInfo />
        <div className="mt-1">
          <ProfileBio />
        </div>
      </div>

      {/* Response time */}
      {responseTimeText && (
        <div className="px-4 mt-3 flex items-center gap-2 text-xs text-green-700">
          <Clock size={14} />
          {responseTimeText}
        </div>
      )}

      {/* Reviews summary */}
      {(reviewCount > 0) && (
        <div className="px-4 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Star size={14} style={{ color: "var(--color-accent)", fill: "var(--color-accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              {avgRating?.toFixed(1)} · {reviewCount} review{reviewCount !== 1 ? "s" : ""}
            </span>
          </div>
          {recentReviews.length > 0 && (
            <div className="space-y-2">
              {recentReviews.map((rev) => (
                <div key={rev.id} className="card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {rev.reviewer?.avatar_url ? (
                      <img src={rev.reviewer.avatar_url} className="w-5 h-5 rounded-full" alt="" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">
                        {(rev.reviewer?.full_name?.[0] ?? "?")}
                      </div>
                    )}
                    <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                      {rev.reviewer?.full_name ?? "User"}
                    </span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} size={10} fill="var(--color-accent)" style={{ color: "var(--color-accent)" }} />
                      ))}
                    </div>
                  </div>
                  {rev.comment && (
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{rev.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-2 px-4 mt-3">
        {isAdmin && (
          <button onClick={handleGoToAdmin} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium active:scale-95 transition-transform"
                  style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", minHeight: 44 }}>
            <Shield size={15} /> Admin
          </button>
        )}
        <button onClick={handleSignOut} disabled={signingOut} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium active:scale-95 transition-transform"
                style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", minHeight: 44 }}>
          {signingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={15} />}
          Sign out
        </button>
        <div className="flex-1" />
      </div>

      {/* Cards */}
      <div className="space-y-2 px-4 mt-3">
        <VerificationStatusBanner />
        <ProfileCompletionMeter />
        <ReferralCodeCard />
        <RoommatePreferencesCard />
        <MyListings />

        {/* Deletion */}
        <div className="pt-2">
          <DeleteAccountButton />
        </div>
      </div>

      <div className="divider mx-4" />

      {/* Posts */}
      <div className="px-4">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Posts ({posts.length})
        </h2>
        {posts.length === 0 ? (
          <div className="rounded-xl py-10 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No posts yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <div key={post.id} className="card p-4">
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>{post.content}</p>
                {post.image_url && (
                  <img src={post.image_url} alt="" className="mt-3 rounded-xl w-full object-cover" style={{ maxHeight: 300 }} loading="lazy" />
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
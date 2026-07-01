import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { profileService } from "@/services/profiles/profileService";
import { postService, type FeedPost } from "@/services/posts/postService";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { reportService } from "@/services/reports/reportService";
import { blockService } from "@/services/safety/blockService";
import { isOnline, timeAgo } from "@/utils/timeAgo";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";
import {
  ArrowLeft, BadgeCheck, GraduationCap, BookOpen, MessageCircle,
  Loader2, Flag, Star, ShieldOff, Shield, Clock,  AlertTriangle 
} from "lucide-react";

type Profile = Tables<"profiles">;
type Accommodation = Tables<"accommodations">;

export default function PublicProfilePage() {
  const completion = useProfileCompletion();
const [recentReviews, setRecentReviews] = useState<any[]>([]);
const [deletionStatus, setDeletionStatus] = useState<string | null>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [listings, setListings] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockToggling, setBlockToggling] = useState(false);


  useEffect(() => {
    if (!id) return;
     supabase
    .from("reviews")
    .select("*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)")
    .eq("reviewed_user_id", id)
    .order("created_at", { ascending: false })
    .limit(3)
    .then(({ data }) => setRecentReviews(data || []));
    (async () => {
      try {
        const prof = await profileService.getProfile(id);
        setProfile(prof);
        const allPosts = await postService.getFeed();
        setPosts(allPosts.filter((p) => p.user_id === id));
        const acc = await accommodationService.getMyAccommodations(id);
        setListings(acc);
        if (currentUser) {
          const blocked = await blockService.isBlocked(currentUser.id, id);
          setIsBlocked(blocked);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
    if (currentUser?.id === id) {
    profileService.getDeletionRequestStatus(id).then(setDeletionStatus);
  }
  }, [id, currentUser]);

  const handleMessage = async () => {
    if (!currentUser || !profile) return;
    const { messageService } = await import("@/services/messages/messageService");
    const existingConvos = await messageService.getConversations(currentUser.id);
    const existing = existingConvos.find(
      (c) =>
        (c.user1_id === currentUser.id && c.user2_id === profile.id) ||
        (c.user2_id === currentUser.id && c.user1_id === profile.id)
    );
    let convId = existing?.id;
    if (!convId) {
      const newConv = await messageService.createConversation(currentUser.id, profile.id);
      convId = newConv.id;
    }
    navigate(`/messages?conversation=${convId}`);
  };

  const handleReport = async () => {
    if (!currentUser) return;
    const reason = prompt("Why are you reporting this user?");
    if (reason) {
      try {
        await reportService.submitReport(currentUser.id, "user", profile!.id, reason);
        alert("Report submitted. Thank you.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleBlockToggle = async () => {
    if (!currentUser || !profile) return;
    setBlockToggling(true);
    try {
      if (isBlocked) {
        await blockService.unblockUser(currentUser.id, profile.id);
        setIsBlocked(false);
      } else {
        if (confirm("Block this user? They won't be able to message you or see your posts.")) {
          await blockService.blockUser(currentUser.id, profile.id);
          setIsBlocked(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBlockToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} size={24} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>User not found.</p>
        <button onClick={() => navigate(-1)} className="btn-ghost text-xs">Go back</button>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const online = isOnline(profile.last_seen);

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
      >
        <button onClick={() => navigate(-1)} className="p-1" aria-label="Go back">
          <ArrowLeft size={20} style={{ color: "var(--color-text-secondary)" }} />
        </button>
        <h1 className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
          {profile.full_name ?? "Profile"}
        </h1>
        <div className="flex items-center gap-2">
          {!isOwnProfile && (
            <>
              <button onClick={handleBlockToggle} disabled={blockToggling} className="p-1" aria-label={isBlocked ? "Unblock user" : "Block user"}>
                {isBlocked ? (
                  <ShieldOff size={18} style={{ color: "var(--color-danger)" }} />
                ) : (
                  <Shield size={18} style={{ color: "var(--color-text-muted)" }} />
                )}
              </button>
              <button onClick={handleReport} className="p-1" aria-label="Report user">
                <Flag size={18} style={{ color: "var(--color-text-muted)" }} />
              </button>
              <button onClick={handleMessage} className="p-1" aria-label="Send message">
                <MessageCircle size={20} style={{ color: "var(--color-primary)" }} />
              </button>
            </>
          )}
                  {/* Profile Completion (own profile only) */}
        {isOwnProfile && completion > 0 && completion < 100 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Profile Completion</span>
              <span className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>{completion}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-200">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${completion}%`, background: "var(--color-primary)" }}
              />
            </div>
          </div>
        )}

        {/* Deletion Request Status */}
        {isOwnProfile && deletionStatus && (
          <div className="mt-4 p-3 rounded-xl bg-yellow-50 border border-yellow-100 flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: "var(--color-warning)" }} />
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Deletion request: {deletionStatus}
            </span>
          </div>
        )}

        {/* Response Time */}
        {profile.response_count && profile.response_count > 0 && (
          <div className="flex items-center gap-2 mt-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            <Clock size={14} />
            <span>Responds in ~{Math.round((profile.total_response_time_ms ?? 0) / (profile.response_count * 1000))} min</span>
          </div>
        )}

        {/* Average Rating & Recent Reviews */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Star size={14} style={{ color: "var(--color-accent)", fill: "var(--color-accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              {profile.avg_rating ? `${profile.avg_rating} · ${profile.review_count || 0} reviews` : "No reviews yet"}
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
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <div className="relative">
              <img src={profile.avatar_url} alt={`${profile.full_name}'s avatar`} className="w-16 h-16 rounded-full object-cover" />
              {online && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />}
            </div>
          ) : (
            <div className="relative">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: "var(--color-primary)" }}>
                {(profile.full_name?.[0] ?? "?").toUpperCase()}
              </div>
              {online && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1">
              <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                {profile.full_name ?? "No name"}
              </h2>
              {profile.is_verified && <BadgeCheck size={16} style={{ color: "var(--color-accent)", fill: "var(--color-accent)" }} />}
            </div>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              @{profile.username ?? "no-username"}
            </p>
            {online && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Online now
              </span>
            )}
            {!online && profile.last_seen && (
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                Last seen {timeAgo(profile.last_seen)}
              </p>
            )}
          </div>
        </div>

        {/* Rest of the component remains unchanged */}
        {profile.bio && (
          <p className="text-sm mt-3" style={{ color: "var(--color-text)" }}>{profile.bio}</p>
        )}
        {!isOwnProfile && (
          <button onClick={() => navigate(`/review/${profile.id}`)} className="btn-primary mt-4 flex items-center gap-2">
            <Star size={14} /> Rate & Review
          </button>
        )}
        <div className="flex flex-col gap-1 mt-3">
          {profile.university && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <GraduationCap size={14} /> {profile.university}
            </div>
          )}
          {profile.course && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <BookOpen size={14} /> {profile.course}{profile.year_of_study ? ` · Year ${profile.year_of_study}` : ""}
            </div>
          )}
        </div>
      </div>

      {listings.length > 0 && (
        <div className="px-4 mt-6">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>Listings</h3>
          <div className="flex flex-col gap-2">
            {listings.map((item) => (
              <Link key={item.id} to={`/accommodation/${item.id}`} className="card p-3 flex justify-between items-center" style={{ textDecoration: "none", color: "inherit" }}>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{item.location} · K{item.monthly_rent}/mo</p>
                </div>
                <span className={`badge ${item.status === "available" ? "badge-amber" : "badge-green"}`}>{item.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 mt-6">
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>Posts ({posts.length})</h3>
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
                  <img src={post.image_url} alt="" className="mt-3 rounded-xl w-full object-cover max-h-60" loading="lazy" />
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
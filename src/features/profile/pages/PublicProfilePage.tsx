import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { profileService } from "@/services/profiles/profileService";
import { postService, type FeedPost } from "@/services/posts/postService";
import { accommodationService } from "@/services/accommodation/accommodationService";
import type { Tables } from "@/types/database/database.types";
import { ArrowLeft, BadgeCheck, GraduationCap, BookOpen, MessageCircle, Loader2 } from "lucide-react";

type Profile = Tables<"profiles">;
type Accommodation = Tables<"accommodations">;

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [listings, setListings] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const prof = await profileService.getProfile(id);
        setProfile(prof);
        const allPosts = await postService.getFeed();
        setPosts(allPosts.filter((p) => p.user_id === id));
        const acc = await accommodationService.getMyAccommodations(id);
        setListings(acc);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      {/* Header */}
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
        {!isOwnProfile && (
          <button onClick={handleMessage} className="p-1" aria-label="Send message">
            <MessageCircle size={20} style={{ color: "var(--color-primary)" }} />
          </button>
        )}
        {isOwnProfile && <div className="w-8" />}
      </div>

      {/* Profile info */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={`${profile.full_name}'s avatar`} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: "var(--color-primary)" }}
            >
              {(profile.full_name?.[0] ?? "?").toUpperCase()}
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
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm mt-3" style={{ color: "var(--color-text)" }}>{profile.bio}</p>
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

      {/* Listings */}
      {listings.length > 0 && (
        <div className="px-4 mt-6">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>Listings</h3>
          <div className="flex flex-col gap-2">
            {listings.map((item) => (
              <Link
                key={item.id}
                to={`/accommodation/${item.id}`}
                className="card p-3 flex justify-between items-center"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {item.location} · K{item.monthly_rent}/mo
                  </p>
                </div>
                <span className={`badge ${item.status === "available" ? "badge-amber" : "badge-green"}`}>
                  {item.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Posts */}
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
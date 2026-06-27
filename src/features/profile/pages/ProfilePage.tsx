import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { supabase } from "@/lib/supabase/client";
import { postService, type FeedPost } from "@/services/posts/postService";
import ProfileHeader from "@/features/profile/components/ProfileHeader";
import ProfileBio from "@/features/profile/components/ProfileBio";
import ProfileInfo from "@/features/profile/components/ProfileInfo";
import MyListings from "@/features/profile/components/MyListings";
import ReferralCodeCard from "@/features/profile/components/ReferralCodeCard";
import VerificationStatusBanner from "@/features/profile/components/VerificationStatusBanner";
import ProfileCompletionMeter from "@/features/profile/components/ProfileCompletionMeter";
import RoommatePreferencesCard from "@/features/profile/components/RoommatePreferencesCard";
import { triggerNotification } from "@/services/notifications/triggerService";
import { adminService } from "@/services/admin/adminService";
import { Shield, LogOut, Trash2, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    postService.getFeed().then((all) =>
      setPosts(all.filter((p) => p.user_id === user.id))
    );
  }, [user]);

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

  const handleDeleteAccount = async () => {
    if (!confirm("Request account deletion? An admin will review this.")) return;
    setDeleting(true);
    try {
      const admins = await adminService.getUsers();
      const adminIds = admins.filter(a => a.is_admin).map(a => a.id);
      await Promise.all(
        adminIds.map(adminId =>
          triggerNotification.accommodationInterest(
            adminId, user.id, "Account Deletion Request",
            `${profile.full_name || profile.email} wants to delete their account.`
          )
        )
      );
      alert("Request sent.");
    } catch { alert("Failed."); }
    finally { setDeleting(false); }
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
        <button onClick={handleDeleteAccount} disabled={deleting} className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-medium active:scale-95 transition-transform"
                style={{ color: "var(--color-danger)", minHeight: 44 }}>
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />}
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-2 px-4 mt-3">
        <VerificationStatusBanner />
        <ProfileCompletionMeter />
        <ReferralCodeCard />
        <RoommatePreferencesCard />
        <MyListings />
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
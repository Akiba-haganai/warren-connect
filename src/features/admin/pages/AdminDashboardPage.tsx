import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { adminService } from "@/services/admin/adminService";
import { verificationService } from "@/services/verification/verificationService";
import { useAuthStore } from "@/store/auth/authStore";
import { triggerNotification } from "@/services/notifications/triggerService";
import FeatureProgressBar from "@/components/ui/FeatureProgressBar";
import type { Tables } from "@/types/database/database.types";
import {
  Loader2, Search, ShieldAlert, Users, ShoppingBag, Building2, FileText, Star,
  EyeOff, Trash2, CheckCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/hooks/useConfirm";

type Profile = Tables<"profiles">;
type VerificationRequest = Tables<"verification_requests">;
type Report = Tables<"reports"> & {
  reporter?: { full_name: string | null; avatar_url: string | null } | null;
};

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { confirm, ConfirmDialog } = useConfirm();

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [resetReqs, setResetReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [contentType, setContentType] = useState<"posts" | "products" | "accommodations">("posts");

  // Fetch all initial data
  useEffect(() => {
    (async () => {
      try {
        const [statsData, usersData, reqsData, reportsData, tagsData, resetData] = await Promise.all([
          adminService.getStats(),
          adminService.getUsers(),
          verificationService.getAllRequests(),
          adminService.getReports(),
          adminService.getAllTags(),
          adminService.getPasswordResetRequests(),
        ]);
        setStats(statsData); setUsers(usersData); setRequests(reqsData);
        setReports(reportsData); setTags(tagsData); setResetReqs(resetData);
      } finally { setLoading(false); }
    })();
  }, []);

  // Fetch content when tab or filter changes
  useEffect(() => {
    if (activeTab !== "content") return;
    const fetchContent = async () => {
      let data;
      if (contentType === "posts") data = await adminService.getAllPosts(search);
      else if (contentType === "products") data = await adminService.getAllProducts(search);
      else data = await adminService.getAllAccommodations(search);
      if (contentType === "posts") setPosts(data || []);
      else if (contentType === "products") setProducts(data || []);
      else setAccommodations(data || []);
    };
    fetchContent();
  }, [activeTab, contentType, search]);

  // Generic error handler
  const handleError = (err: any) => toast.error(err?.message || "An error occurred");

  // ---- VERIFICATION HANDLERS ----
  const handleApprove = async (request: VerificationRequest) => {
    if (!user) return;
    try {
      await verificationService.approveRequest(request.id, user.id, request.user_id);
      setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: "approved", reviewed_by: user.id } : r)));
      setUsers((prev) => prev.map((u) => (u.id === request.user_id ? { ...u, is_verified: true } : u)));
      await triggerNotification.system(
        request.user_id,
        "Verification Approved ✅",
        "Your verification request has been approved.",
        "/profile"
      );
      toast.success("Verification approved");
    } catch (err) { handleError(err); }
  };

  const handleReject = async (request: VerificationRequest) => {
    if (!user) return;
    try {
      await verificationService.rejectRequest(request.id, user.id);
      setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: "rejected", reviewed_by: user.id } : r)));
      await triggerNotification.system(
        request.user_id,
        "Verification Rejected ❌",
        "Your verification request was not approved.",
        "/profile"
      );
      toast.success("Verification rejected");
    } catch (err) { handleError(err); }
  };

  // ---- REPORT HANDLERS ----
  const handleReportAction = async (reportId: string, action: "reviewed" | "resolved") => {
    try {
      await adminService.updateReportStatus(reportId, action);
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: action } : r)));
      toast.success(`Report marked as ${action}`);
    } catch (err) { handleError(err); }
  };

  const handleHideContent = async (type: string, id: string) => {
    try {
      if (type === "post") await adminService.hidePost(id, true);
      else if (type === "product") await adminService.hideProduct(id, true);
      else if (type === "accommodation") await adminService.hideAccommodation(id, true);
      toast.success(`${type} hidden`);
      // Refresh content list
      if (activeTab === "content") {
        if (contentType === "posts") setPosts(await adminService.getAllPosts(search));
        else if (contentType === "products") setProducts(await adminService.getAllProducts(search));
        else setAccommodations(await adminService.getAllAccommodations(search));
      }
    } catch (err) { handleError(err); }
  };

  const handleDeleteContent = async (type: string, id: string) => {
    const ok = await confirm({ title: "Delete content?", message: `Permanently delete this ${type}?` });
    if (!ok) return;
    try {
      if (type === "post") await adminService.deletePost(id);
      else if (type === "product") await adminService.deleteProduct(id);
      else if (type === "accommodation") await adminService.deleteAccommodation(id);
      toast.success(`${type} deleted`);
      // Remove from local list
      if (activeTab === "content") {
        if (contentType === "posts") setPosts((prev) => prev.filter((p) => p.id !== id));
        else if (contentType === "products") setProducts((prev) => prev.filter((p) => p.id !== id));
        else setAccommodations((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) { handleError(err); }
  };

  // ---- USER HANDLERS ----
  const handleBanUser = async (userId: string, currentlyBanned: boolean) => {
    const ok = await confirm({ title: currentlyBanned ? "Unban user?" : "Ban user?", message: "This will restrict their access." });
    if (!ok) return;
    try {
      await adminService.toggleBanUser(userId, !currentlyBanned);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_banned: !currentlyBanned } : u)));
      toast.success(currentlyBanned ? "User unbanned" : "User banned");
    } catch (err) { handleError(err); }
  };

  const handleToggleRole = async (userId: string, field: string, current: boolean) => {
    const ok = await confirm({
      title: `Toggle ${field}`,
      message: `Are you sure you want to ${current ? "remove" : "grant"} this role?`,
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from("profiles").update({ [field]: !current } as any).eq("id", userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, [field]: !current } : u)));
      toast.success(`User role updated`);
    } catch (err) { handleError(err); }
  };

  // ---- TAG HANDLERS ----
  const handleCreateTag = async () => {
    const name = prompt("Enter tag name:");
    if (!name) return;
    try {
      await adminService.createTag(name);
      setTags(await adminService.getAllTags());
      toast.success("Tag created");
    } catch (err) { handleError(err); }
  };

  const handleDeleteTag = async (tagId: string) => {
    const ok = await confirm({ title: "Delete tag?", message: "This cannot be undone." });
    if (!ok) return;
    try {
      await adminService.deleteTag(tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      toast.success("Tag deleted");
    } catch (err) { handleError(err); }
  };

  // ---- PASSWORD RESET HANDLERS ----
  const handleMarkReset = async (id: string) => {
    try {
      await adminService.markResetHandled(id);
      setResetReqs((prev) => prev.filter((r) => r.id !== id));
      toast.success("Reset request handled");
    } catch (err) { handleError(err); }
  };

  const handleSendResetEmail = async (email: string, id: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password?reset=true`,
      });
      if (error) throw error;
      await supabase.from("notifications").delete().eq("id", id);
      setResetReqs((prev) => prev.filter((r) => r.id !== id));
      toast.success("Password reset email sent to user!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    }
  };

  // ---- FEATURE HANDLER (content tab) ----
  const handleFeature = async (type: string, id: string, currentFeatured: boolean) => {
    try {
      await adminService.updateContentFeatured(type, id, !currentFeatured);
      if (type === "post") setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, featured: !currentFeatured } : p)));
      else if (type === "product") setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, featured: !currentFeatured } : p)));
      else setAccommodations((prev) => prev.map((a) => (a.id === id ? { ...a, featured: !currentFeatured } : a)));
      toast.success(`Item ${currentFeatured ? "unfeatured" : "featured"}`);
    } catch (err) { handleError(err); }
  };

  // ---- UNHIDE content ----
  const handleUnhideContent = async (type: string, id: string) => {
    try {
      if (type === "post") await adminService.hidePost(id, false);
      else if (type === "product") await adminService.hideProduct(id, false);
      else if (type === "accommodation") await adminService.hideAccommodation(id, false);
      toast.success(`${type} unhidden`);
      if (activeTab === "content") {
        if (contentType === "posts") setPosts(await adminService.getAllPosts(search));
        else if (contentType === "products") setProducts(await adminService.getAllProducts(search));
        else setAccommodations(await adminService.getAllAccommodations(search));
      }
    } catch (err) { handleError(err); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} /></div>;

  // Helper component for stats card
  const StatsCard = ({ icon: Icon, label, value, color }: { icon: React.FC<{ size?: number }>; label: string; value: number; color: string; }) => (
    <div className="card p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}20`, color }}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold" style={{ color }}>{value || 0}</p>
        <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      </div>
    </div>
  );

  const tabButtons = [
    { key: "overview", label: "📊 Overview" },
    { key: "users", label: "👥 Users" },
    { key: "content", label: "📦 Content" },
    { key: "verifications", label: "🛡️ Verifications" },
    { key: "reports", label: "🚩 Reports" },
    { key: "tags", label: "🏷️ Tags" },
    { key: "resets", label: "🔑 Resets" },
  ];

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      {/* Header with tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Admin Dashboard</h1>
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {tabButtons.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSearchParams({ tab: tab.key })}
              className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${
                activeTab === tab.key ? "bg-primary text-white" : "bg-gray-200 dark:bg-gray-700"
              }`}
              style={
                activeTab === tab.key
                  ? { background: "var(--color-primary)", color: "#fff" }
                  : { background: "var(--color-border)", color: "var(--color-text)" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== OVERVIEW ===== */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <FeatureProgressBar />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatsCard icon={Users} label="Users" value={stats?.totalUsers} color="var(--color-primary)" />
            <StatsCard icon={ShoppingBag} label="Products" value={stats?.totalProducts} color="var(--color-accent)" />
            <StatsCard icon={Building2} label="Accommodations" value={stats?.totalAccommodations} color="var(--color-success)" />
            <StatsCard icon={FileText} label="Pending Reports" value={stats?.pendingReports} color="var(--color-warning)" />
            <StatsCard icon={ShieldAlert} label="Pending Verif." value={stats?.pendingVerifications} color="var(--color-danger)" />
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>Recent Users</h3>
            {stats?.recentUsers.map((u: Profile) => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  {u.avatar_url ? <img src={u.avatar_url} className="w-8 h-8 rounded-full flex-shrink-0" /> : <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{u.full_name?.[0] || "?"}</div>}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                    <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>{u.email}</p>
                  </div>
                </div>
                <span className="text-xs flex-shrink-0 ml-2" style={{ color: "var(--color-text-muted)" }}>{new Date(u.created_at!).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== USERS ===== */}
      {activeTab === "users" && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
            <input className="input-field pl-9" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {users.filter((u) => (u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))).map((u) => (
            <div key={u.id} className="card p-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{u.full_name || u.email}</p>
                  <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>{u.email}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => handleBanUser(u.id, u.is_banned ?? false)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">{u.is_banned ? "Unban" : "Ban"}</button>
                  <button onClick={() => handleToggleRole(u.id, "is_admin", u.is_admin)} className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">{u.is_admin ? "Revoke Admin" : "Make Admin"}</button>
                  <button onClick={() => handleToggleRole(u.id, "is_verified", u.is_verified)} className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">{u.is_verified ? "Unverify" : "Verify"}</button>
                  <button onClick={() => handleToggleRole(u.id, "is_landlord", u.is_landlord ?? false)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">{u.is_landlord ? "Remove Landlord" : "Make Landlord"}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== CONTENT ===== */}
      {activeTab === "content" && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
              <input className="input-field pl-9" placeholder="Search content..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={contentType} onChange={(e) => setContentType(e.target.value as any)} className="input-field w-auto text-sm">
              <option value="posts">Posts</option>
              <option value="products">Products</option>
              <option value="accommodations">Accommodations</option>
            </select>
          </div>
          {contentType === "posts" && posts.map((p) => (
            <div key={p.id} className="card p-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <p className="text-sm line-clamp-2 flex-1 min-w-0">{p.content}</p>
              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                <button onClick={() => handleFeature("posts", p.id, p.featured)} className={`text-xs px-2 py-1 rounded ${p.featured ? "bg-yellow-300 text-yellow-900" : "bg-yellow-100 text-yellow-800"}`}><Star size={12} /> {p.featured ? "Unfeature" : "Feature"}</button>
                <button onClick={() => p.is_hidden ? handleUnhideContent("post", p.id) : handleHideContent("post", p.id)} className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">{p.is_hidden ? "Unhide" : "Hide"}</button>
                <button onClick={() => handleDeleteContent("post", p.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800"><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
          {contentType === "products" && products.map((p) => (
            <div key={p.id} className="card p-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <p className="text-sm line-clamp-2 flex-1 min-w-0">{p.title} – K{p.price}</p>
              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                <button onClick={() => handleFeature("products", p.id, p.featured)} className={`text-xs px-2 py-1 rounded ${p.featured ? "bg-yellow-300 text-yellow-900" : "bg-yellow-100 text-yellow-800"}`}><Star size={12} /> {p.featured ? "Unfeature" : "Feature"}</button>
                <button onClick={() => p.is_hidden ? handleUnhideContent("product", p.id) : handleHideContent("product", p.id)} className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">{p.is_hidden ? "Unhide" : "Hide"}</button>
                <button onClick={() => handleDeleteContent("product", p.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800"><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
          {contentType === "accommodations" && accommodations.map((a) => (
            <div key={a.id} className="card p-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <p className="text-sm line-clamp-2 flex-1 min-w-0">{a.title} – K{a.monthly_rent}/mo</p>
              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                <button onClick={() => handleFeature("accommodations", a.id, a.featured)} className={`text-xs px-2 py-1 rounded ${a.featured ? "bg-yellow-300 text-yellow-900" : "bg-yellow-100 text-yellow-800"}`}><Star size={12} /> {a.featured ? "Unfeature" : "Feature"}</button>
                <button onClick={() => a.is_hidden ? handleUnhideContent("accommodation", a.id) : handleHideContent("accommodation", a.id)} className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">{a.is_hidden ? "Unhide" : "Hide"}</button>
                <button onClick={() => handleDeleteContent("accommodation", a.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800"><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== VERIFICATIONS ===== */}
      {activeTab === "verifications" && (
        <div className="space-y-3">
          {requests.length === 0 && <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No verification requests yet.</p>}
          {requests.map((req: any) => (
            <div key={req.id} className="card p-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{req.full_name}</p>
                <span className={`text-xs px-2 py-1 rounded-full self-start ${req.status === "pending" ? "bg-yellow-100 text-yellow-800" : req.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{req.status}</span>
              </div>
              {(req.id_document_url || req.image_url) && (
                <div className="space-y-2">
                  <a href={req.id_document_url || req.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline block break-all">
                    View ID Document
                  </a>
                  <img src={req.id_document_url || req.image_url} alt="ID Document Preview" className="max-h-48 rounded-lg mt-2 object-contain border" />
                </div>
              )}
              {req.reason && <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{req.reason}</p>}
              {req.status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(req)} className="px-3 py-1 bg-green-500 text-white rounded text-sm">Approve</button>
                  <button onClick={() => handleReject(req)} className="px-3 py-1 bg-red-500 text-white rounded text-sm">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== REPORTS ===== */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 && <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No reports yet.</p>}
          {reports.map((report) => (
            <div key={report.id} className="card p-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{report.reporter?.full_name || "Unknown"} reported a {report.content_type}</p>
                  <p className="text-xs break-words" style={{ color: "var(--color-text-muted)" }}>{report.reason}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Status: {report.status || "pending"}</p>
                </div>
                <div className="flex gap-2 flex-wrap flex-shrink-0">
                  <button onClick={() => handleReportAction(report.id, "reviewed")} className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800"><ShieldAlert size={12} /> Review</button>
                  <button onClick={() => handleReportAction(report.id, "resolved")} className="text-xs px-2 py-1 rounded bg-green-100 text-green-800"><CheckCircle size={12} /> Resolve</button>
                  {report.content_type !== "user" && (
                    <>
                      <button onClick={() => handleHideContent(report.content_type, report.content_id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800"><EyeOff size={12} /> Hide</button>
                      <button onClick={() => handleDeleteContent(report.content_type, report.content_id)} className="text-xs px-2 py-1 rounded bg-red-200 text-red-900"><Trash2 size={12} /> Delete</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== TAGS ===== */}
      {activeTab === "tags" && (
        <div className="space-y-3">
          <button onClick={handleCreateTag} className="btn-primary w-auto px-4">+ Create Tag</button>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tags.map((tag) => (
              <div key={tag.id} className="card p-3 flex justify-between items-center gap-2">
                <span className="text-sm font-medium truncate">{tag.name}</span>
                <button onClick={() => handleDeleteTag(tag.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 flex-shrink-0">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== PASSWORD RESETS ===== */}
      {activeTab === "resets" && (
        <div className="space-y-3">
          {resetReqs.length === 0 ? <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No pending password reset requests.</p> :
            resetReqs.map((r) => {
              // Extract the email if possible from body, e.g. "email has requested..."
              const emailMatch = r.body?.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
              const extractedEmail = emailMatch ? emailMatch[1] : null;

              return (
                <div key={r.id} className="card p-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{r.title}</p>
                    <p className="text-xs break-words">{r.body}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{new Date(r.created_at!).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {extractedEmail && (
                      <button onClick={() => handleSendResetEmail(extractedEmail, r.id)} className="text-xs px-3 py-1 rounded bg-blue-500 text-white flex-shrink-0">
                        Send Reset Link
                      </button>
                    )}
                    <button onClick={() => handleMarkReset(r.id)} className="text-xs px-3 py-1 rounded bg-green-100 text-green-800 flex-shrink-0">
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}
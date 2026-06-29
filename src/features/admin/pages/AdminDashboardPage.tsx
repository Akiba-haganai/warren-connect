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
  Loader2, CheckCircle, EyeOff, Trash2, ShieldAlert,
  Users, ShoppingBag, Building2, FileText, Star,
} from "lucide-react";


type Profile = Tables<"profiles">;
type VerificationRequest = Tables<"verification_requests">;
type Report = Tables<"reports"> & {
  reporter?: { full_name: string | null; avatar_url: string | null } | null;
};

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

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

  useEffect(() => {
    if (activeTab !== "content") return;
    (async () => {
      if (contentType === "posts") setPosts(await adminService.getAllPosts(search));
      else if (contentType === "products") setProducts(await adminService.getAllProducts(search));
      else setAccommodations(await adminService.getAllAccommodations(search));
    })();
  }, [activeTab, search, contentType]);

  // ---------- VERIFICATION HANDLERS ----------
  const handleApprove = async (request: VerificationRequest) => {
    if (!user) return;
    await verificationService.approveRequest(request.id, user.id, request.user_id);
    setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: "approved", reviewed_by: user.id } : r)));
    setUsers((prev) => prev.map((u) => (u.id === request.user_id ? { ...u, is_verified: true } : u)));
    // ✅ use system notification instead of accommodationInterest
    await triggerNotification.system(
      request.user_id,
      "Verification Approved ✅",
      "Your verification request has been approved.",
      "/profile"
    );
  };

  const handleReject = async (request: VerificationRequest) => {
    if (!user) return;
    await verificationService.rejectRequest(request.id, user.id);
    setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: "rejected", reviewed_by: user.id } : r)));
    await triggerNotification.system(
      request.user_id,
      "Verification Rejected ❌",
      "Your verification request was not approved.",
      "/profile"
    );
  };

  // ---------- REPORT HANDLERS ----------
  const handleReportAction = async (reportId: string, action: "reviewed" | "resolved") => {
    await adminService.updateReportStatus(reportId, action);
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: action } : r)));
  };

  const handleHideContent = async (type: string, id: string) => {
    if (type === "post") await adminService.hidePost(id, true);
    else if (type === "product") await adminService.hideProduct(id, true);
    else if (type === "accommodation") await adminService.hideAccommodation(id, true);
    alert(`${type} hidden.`);
  };

  const handleDeleteContent = async (type: string, id: string) => {
    if (!confirm(`Permanently delete this ${type}? This cannot be undone.`)) return;
    try {
      if (type === "post") await adminService.deletePost(id);
      else if (type === "product") await adminService.deleteProduct(id);
      else if (type === "accommodation") await adminService.deleteAccommodation(id);
      alert(`${type} deleted.`);
      if (contentType === "posts") setPosts(await adminService.getAllPosts(search));
      else if (contentType === "products") setProducts(await adminService.getAllProducts(search));
      else setAccommodations(await adminService.getAllAccommodations(search));
    } catch (err: any) { alert(err.message); }
  };

  // ---------- USER HANDLERS ----------
  const handleBanUser = async (userId: string, currentlyBanned: boolean) => {
    await adminService.toggleBanUser(userId, !currentlyBanned);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_banned: !currentlyBanned } : u)));
  };

  const handleToggleRole = async (userId: string, field: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ [field]: !current } as any).eq("id", userId);
    if (!error) setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, [field]: !current } : u)));
  };

  // ---------- TAG HANDLERS ----------
  const handleCreateTag = async () => {
    const name = prompt("Enter tag name:"); if (!name) return;
    await adminService.createTag(name);
    setTags(await adminService.getAllTags());
  };
  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Delete this tag?")) return;
    await adminService.deleteTag(tagId);
    setTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  // ---------- PASSWORD RESET HANDLERS ----------
  const handleMarkReset = async (id: string) => {
    await adminService.markResetHandled(id);
    setResetReqs((prev) => prev.filter((r) => r.id !== id));
  };

  // ---------- FEATURE HANDLER (content tab) ----------
  const handleFeature = async (type: string, id: string, currentFeatured: boolean) => {
    const table = type === "posts" ? "posts" : type === "products" ? "products" : "accommodations";
    const newValue = !currentFeatured;
    const { error } = await supabase.from(table).update({ featured: newValue }).eq("id", id);
    if (!error) {
      if (type === "posts") setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, featured: newValue } : p)));
      else if (type === "products") setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, featured: newValue } : p)));
      else setAccommodations((prev) => prev.map((a) => (a.id === id ? { ...a, featured: newValue } : a)));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} /></div>;

  return (
    <div className="p-4 space-y-6" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Admin Dashboard</h1>
        <div className="flex gap-2">
          {(["overview","users","content","verifications","reports","tags","resets"] as const).map((t) => (
            <button key={t} onClick={() => setSearchParams({ tab: t })} className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize ${activeTab === t ? "bg-primary text-white" : "bg-gray-200 dark:bg-gray-700"}`}
              style={activeTab === t ? { background: "var(--color-primary)", color: "#fff" } : { background: "var(--color-border)", color: "var(--color-text)" }}>
              {t === "overview" && "📊 Overview"} {t === "users" && "👥 Users"} {t === "content" && "📦 Content"}
              {t === "verifications" && "🛡️ Verifications"} {t === "reports" && "🚩 Reports"} {t === "tags" && "🏷️ Tags"} {t === "resets" && "🔑 Resets"}
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
                <div className="flex items-center gap-2">
                  {u.avatar_url ? <img src={u.avatar_url} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">{u.full_name?.[0] || "?"}</div>}
                  <div><p className="text-sm font-medium">{u.full_name || u.email}</p><p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{u.email}</p></div>
                </div>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{new Date(u.created_at!).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== USERS ===== */}
      {activeTab === "users" && (
        <div className="space-y-3">
          <input className="input-field" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {users.filter((u) => (u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))).map((u) => (
            <div key={u.id} className="card p-4 space-y-2">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div><p className="font-semibold text-sm">{u.full_name || u.email}</p><p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{u.email}</p></div>
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
          <div className="flex gap-2 flex-wrap">
            <input className="input-field flex-1" placeholder="Search content..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={contentType} onChange={(e) => setContentType(e.target.value as any)} className="input-field w-auto text-sm">
              <option value="posts">Posts</option>
              <option value="products">Products</option>
              <option value="accommodations">Accommodations</option>
            </select>
          </div>
          {contentType === "posts" && posts.map((p) => (
            <div key={p.id} className="card p-4 flex justify-between items-center">
              <p className="text-sm line-clamp-2 flex-1">{p.content}</p>
              <div className="flex gap-2 ml-2">
                <button onClick={() => handleFeature("posts", p.id, p.featured)} className={`text-xs px-2 py-1 rounded ${p.featured ? "bg-yellow-300 text-yellow-900" : "bg-yellow-100 text-yellow-800"}`}><Star size={12} /> {p.featured ? "Unfeature" : "Feature"}</button>
                <button onClick={() => adminService.hidePost(p.id, !p.is_hidden)} className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">{p.is_hidden ? "Unhide" : "Hide"}</button>
                <button onClick={() => adminService.deletePost(p.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Delete</button>
              </div>
            </div>
          ))}
          {contentType === "products" && products.map((p) => (
            <div key={p.id} className="card p-4 flex justify-between items-center">
              <p className="text-sm line-clamp-2 flex-1">{p.title} – K{p.price}</p>
              <div className="flex gap-2 ml-2">
                <button onClick={() => handleFeature("products", p.id, p.featured)} className={`text-xs px-2 py-1 rounded ${p.featured ? "bg-yellow-300 text-yellow-900" : "bg-yellow-100 text-yellow-800"}`}><Star size={12} /> {p.featured ? "Unfeature" : "Feature"}</button>
                <button onClick={() => adminService.hideProduct(p.id, !p.is_hidden)} className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">{p.is_hidden ? "Unhide" : "Hide"}</button>
                <button onClick={() => adminService.deleteProduct(p.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Delete</button>
              </div>
            </div>
          ))}
          {contentType === "accommodations" && accommodations.map((a) => (
            <div key={a.id} className="card p-4 flex justify-between items-center">
              <p className="text-sm line-clamp-2 flex-1">{a.title} – K{a.monthly_rent}/mo</p>
              <div className="flex gap-2 ml-2">
                <button onClick={() => handleFeature("accommodations", a.id, a.featured)} className={`text-xs px-2 py-1 rounded ${a.featured ? "bg-yellow-300 text-yellow-900" : "bg-yellow-100 text-yellow-800"}`}><Star size={12} /> {a.featured ? "Unfeature" : "Feature"}</button>
                <button onClick={() => adminService.hideAccommodation(a.id, !a.is_hidden)} className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">{a.is_hidden ? "Unhide" : "Hide"}</button>
                <button onClick={() => adminService.deleteAccommodation(a.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== VERIFICATIONS ===== */}
      {activeTab === "verifications" && (
        <div className="space-y-3">
          {requests.length === 0 && <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No verification requests yet.</p>}
          {requests.map((req) => (
            <div key={req.id} className="card p-4 space-y-2">
              <div className="flex justify-between">
                <p className="font-semibold" style={{ color: "var(--color-text)" }}>{req.full_name}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${req.status === "pending" ? "bg-yellow-100 text-yellow-800" : req.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{req.status}</span>
              </div>
              {req.id_document_url && <a href={req.id_document_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline block">View ID Document</a>}
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
            <div key={report.id} className="card p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{report.reporter?.full_name || "Unknown"} reported a {report.content_type}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{report.reason}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Status: {report.status || "pending"}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
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
          <div className="grid grid-cols-2 gap-3">
            {tags.map((tag) => (
              <div key={tag.id} className="card p-3 flex justify-between items-center">
                <span className="text-sm font-medium">{tag.name}</span>
                <button onClick={() => handleDeleteTag(tag.id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== PASSWORD RESETS ===== */}
      {activeTab === "resets" && (
        <div className="space-y-3">
          {resetReqs.length === 0 ? <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No pending password reset requests.</p> :
            resetReqs.map((r) => (
              <div key={r.id} className="card p-4 flex justify-between items-center">
                <div><p className="text-sm font-semibold">{r.title}</p><p className="text-xs">{r.body}</p><p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{new Date(r.created_at!).toLocaleString()}</p></div>
                <button onClick={() => handleMarkReset(r.id)} className="text-xs px-3 py-1 rounded bg-green-100 text-green-800">Handled</button>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// Helper StatsCard component
function StatsCard({ icon: Icon, label, value, color }: { icon: React.FC<{ size?: number }>; label: string; value: number; color: string; }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${color}20`, color }}><Icon size={20} /></div>
      <div><p className="text-lg font-bold" style={{ color }}>{value || 0}</p><p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{label}</p></div>
    </div>
  );
}
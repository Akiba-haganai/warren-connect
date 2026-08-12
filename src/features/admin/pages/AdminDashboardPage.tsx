import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { adminService } from "@/services/admin/adminService";
import { verificationService } from "@/services/verification/verificationService";
import { recoveryService } from "@/services/auth/recoveryService";
import { useAuthStore } from "@/store/auth/authStore";
import { triggerNotification } from "@/services/notifications/triggerService";
import type { Tables } from "@/types/database/database.types"; // ✅ added
import {
  Loader2, Search, Users, ShoppingBag, Building2, FileText, Star,
  EyeOff, Trash2, ShieldAlert
} from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/hooks/useConfirm";

type Profile = Tables<"profiles">;
type VerificationRequest = Tables<"verification_requests">;
type Report = Tables<"reports"> & {
  reporter?: { full_name: string | null; avatar_url: string | null } | null;
};

const TABS = [
  "overview",
  "users",
  "content",
  "verifications",
  "reports",
  "tags",
  "resets",
] as const;

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
  const [newTagName, setNewTagName] = useState("");
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [contentType, setContentType] = useState<"posts" | "products" | "accommodations">("posts");

  useEffect(() => {
    (async () => {
      try {
        const [s, u, r, rp, t, rs] = await Promise.all([
          adminService.getStats(),
          adminService.getUsers(),
          verificationService.getAllRequests(),
          adminService.getReports(),
          adminService.getAllTags(),
          recoveryService.getRecoveryRequests(),
        ]);
        setStats(s); setUsers(u); setRequests(r); setReports(rp); setTags(t); setResetReqs(rs);
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (activeTab !== "content") return;
    const fetcher =
      contentType === "posts"
        ? adminService.getAllPosts
        : contentType === "products"
        ? adminService.getAllProducts
        : adminService.getAllAccommodations;
    fetcher(search).then((d) => {
      if (contentType === "posts") setPosts(d || []);
      else if (contentType === "products") setProducts(d || []);
      else setAccommodations(d || []);
    });
  }, [activeTab, contentType, search]);

  const err = (e: any) => toast.error(e?.message || "Error");
  const refresh = async () => {
    if (activeTab === "content") {
      const fetcher =
        contentType === "posts"
          ? adminService.getAllPosts
          : contentType === "products"
          ? adminService.getAllProducts
          : adminService.getAllAccommodations;
      const d = await fetcher(search);
      if (contentType === "posts") setPosts(d || []);
      else if (contentType === "products") setProducts(d || []);
      else setAccommodations(d || []);
    }
  };

  const handleApprove = async (req: VerificationRequest) => {
    if (!user) return;
    try {
      await verificationService.approveRequest(req.id, user.id, req.user_id);
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: "approved" } : r)));
      await triggerNotification.system(req.user_id, "Verification Approved ✅", "", "/profile");
      toast.success("Approved");
    } catch (e) { err(e); }
  };

  const handleReject = async (req: VerificationRequest) => {
    if (!user) return;
    try {
      await verificationService.rejectRequest(req.id, user.id);
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: "rejected" } : r)));
      await triggerNotification.system(req.user_id, "Verification Rejected ❌", "", "/profile");
      toast.success("Rejected");
    } catch (e) { err(e); }
  };

  const handleReportAction = async (id: string, action: "reviewed" | "resolved") => {
    try {
      await adminService.updateReportStatus(id, action);
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: action } : r)));
      toast.success(`Report ${action}`);
    } catch (e) { err(e); }
  };

  const handleHide = async (type: string, id: string) => {
    try {
      if (type === "post") await adminService.hidePost(id, true);
      else if (type === "product") await adminService.hideProduct(id, true);
      else await adminService.hideAccommodation(id, true);
      toast.success("Hidden");
      refresh();
    } catch (e) { err(e); }
  };

  const handleUnhide = async (type: string, id: string) => {
    try {
      if (type === "post") await adminService.hidePost(id, false);
      else if (type === "product") await adminService.hideProduct(id, false);
      else await adminService.hideAccommodation(id, false);
      toast.success("Unhidden");
      refresh();
    } catch (e) { err(e); }
  };

  const handleDelete = async (type: string, id: string) => {
    const ok = await confirm({ title: "Delete?", message: `Permanently delete this ${type}?` });
    if (!ok) return;
    try {
      if (type === "post") await adminService.deletePost(id);
      else if (type === "product") await adminService.deleteProduct(id);
      else await adminService.deleteAccommodation(id);
      toast.success("Deleted");
      refresh();
    } catch (e) { err(e); }
  };

  const queryClient = useQueryClient();

  const handleBan = async (userId: string, banned: boolean) => {
    const ok = await confirm({ title: banned ? "Unban?" : "Ban?", message: "Change user access" });
    if (!ok) return;
    try {
      await adminService.toggleBanUser(userId, !banned);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_banned: !banned } : u)));
      
      // Invalidate all feeds where this user might appear
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      toast.success(banned ? "Unbanned" : "Banned");
    } catch (e) { err(e); }
  };

  const handleRole = async (userId: string, field: string, current: boolean) => {
    const ok = await confirm({ title: `Toggle ${field}`, message: `Are you sure?` });
    if (!ok) return;
    try {
      await supabase.from("profiles").update({ [field]: !current } as any).eq("id", userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, [field]: !current } : u)));
      toast.success("Updated");
    } catch (e) { err(e); }
  };

  const handleFeature = async (type: string, id: string, featured: boolean) => {
    try {
      await adminService.updateContentFeatured(type, id, !featured);
      if (type === "post") setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, featured: !featured } : p)));
      else if (type === "product") setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, featured: !featured } : p)));
      else setAccommodations((prev) => prev.map((a) => (a.id === id ? { ...a, featured: !featured } : a)));
      toast.success(featured ? "Unfeatured" : "Featured");
    } catch (e) { err(e); }
  };

  const handleCreateTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      await adminService.createTag(newTagName.trim());
      setTags(await adminService.getAllTags());
      setNewTagName("");
      toast.success("Tag created");
    } catch (e) { err(e); }
  };

  const handleDeleteTag = async (id: string) => {
    const ok = await confirm({ title: "Delete tag?", message: "Cannot be undone." });
    if (!ok) return;
    try {
      await adminService.deleteTag(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
      toast.success("Deleted");
    } catch (e) { err(e); }
  };

  if (loading)
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  const pendingResetCount = resetReqs.filter((r) => r.status === "verified_pending_admin").length;
  const pendingVerificationCount = requests.filter((r) => r.status === "pending").length;
  const pendingReportCount = reports.filter((r) => !r.status || r.status === "pending").length;

  const Pill = ({ tab }: { tab: string }) => {
    const count =
      tab === "resets"
        ? pendingResetCount
        : tab === "verifications"
        ? pendingVerificationCount
        : tab === "reports"
        ? pendingReportCount
        : 0;

    return (
      <button
        onClick={() => setSearchParams({ tab })}
        className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
          activeTab === tab ? "bg-primary text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
        }`}
        style={activeTab === tab ? { background: "var(--color-primary)", color: "#fff" } : {}}
      >
        <span className="capitalize">{tab}</span>
        {count > 0 && (
          <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
            activeTab === tab
              ? "bg-white text-blue-700"
              : "bg-red-500 text-white"
          }`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  const TinyStat = ({ icon: Icon, label, value, color }: any) => (
    <div className="card p-2 flex items-center gap-2">
      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${color}20`, color }}>
        <Icon size={14} />
      </div>
      <div>
        <p className="text-sm font-bold" style={{ color }}>{value || 0}</p>
        <p className="text-[10px] text-muted">{label}</p>
      </div>
    </div>
  );

  const ActionButtons = ({ type, item }: any) => (
    <div className="flex gap-1 flex-shrink-0">
      <button onClick={() => handleFeature(type, item.id, item.featured)} className={`p-1 rounded ${item.featured ? "bg-yellow-300" : "bg-yellow-100"}`} title={item.featured ? "Unfeature" : "Feature"}>
        <Star size={12} />
      </button>
      <button onClick={() => item.is_hidden ? handleUnhide(type, item.id) : handleHide(type, item.id)} className="p-1 rounded bg-yellow-100" title={item.is_hidden ? "Unhide" : "Hide"}>
        <EyeOff size={12} />
      </button>
      <button onClick={() => handleDelete(type, item.id)} className="p-1 rounded bg-red-100 text-red-800" title="Delete">
        <Trash2 size={12} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-20 bg-surface border-b border-border px-3 py-2 overflow-x-auto hide-scrollbar">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <Pill key={t} tab={t} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Overview */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <TinyStat icon={Users} label="Users" value={stats?.totalUsers} color="var(--color-primary)" />
              <TinyStat icon={ShoppingBag} label="Products" value={stats?.totalProducts} color="var(--color-accent)" />
              <TinyStat icon={Building2} label="Accommodations" value={stats?.totalAccommodations} color="var(--color-success)" />
              <TinyStat icon={FileText} label="Reports" value={stats?.pendingReports} color="var(--color-warning)" />
              <TinyStat icon={ShieldAlert} label="Verifications" value={stats?.pendingVerifications} color="var(--color-danger)" />
            </div>
            <div className="card p-2">
              <h3 className="text-xs font-semibold mb-2">Recent Users</h3>
              {stats?.recentUsers.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between py-1 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {u.avatar_url ? <img src={u.avatar_url} className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">{u.full_name?.[0] || "?"}</div>}
                    <span className="truncate">{u.full_name || u.email}</span>
                  </div>
                  <span className="text-muted flex-shrink-0 ml-2">{new Date(u.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="space-y-2">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input className="input-field pl-9 text-sm" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {users.filter((u) => (u.full_name || "").toLowerCase().includes(search.toLowerCase()) || u.email.includes(search.toLowerCase())).map((u) => (
              <div key={u.id} className="card p-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                  <p className="text-[10px] text-muted truncate">{u.email}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleBan(u.id, u.is_banned ?? false)} className="text-[10px] px-2 py-1 rounded bg-red-100 text-red-800">
                    {u.is_banned ? "Unban" : "Ban"}
                  </button>
                  <button onClick={() => handleRole(u.id, "is_admin", u.is_admin)} className="text-[10px] px-2 py-1 rounded bg-purple-100 text-purple-800">
                    {u.is_admin ? "Revoke" : "Admin"}
                  </button>
                  <button onClick={() => handleRole(u.id, "is_verified", u.is_verified)} className="text-[10px] px-2 py-1 rounded bg-green-100 text-green-800">
                    {u.is_verified ? "Unverify" : "Verify"}
                  </button>
                  <button onClick={() => handleRole(u.id, "is_landlord", u.is_landlord ?? false)} className="text-[10px] px-2 py-1 rounded bg-blue-100 text-blue-800">
                    {u.is_landlord ? "Remove" : "Landlord"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {activeTab === "content" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input className="input-field pl-9 text-sm" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select value={contentType} onChange={(e) => setContentType(e.target.value as any)} className="input-field w-auto text-sm">
                <option value="posts">Posts</option>
                <option value="products">Products</option>
                <option value="accommodations">Accommodations</option>
              </select>
            </div>
            {(contentType === "posts" ? posts : contentType === "products" ? products : accommodations).map((item) => (
              <div key={item.id} className="card p-2 flex items-start justify-between gap-2">
                <p className="text-xs line-clamp-2 flex-1 min-w-0">
                  {contentType === "posts" ? item.content : item.title}
                  {item.price ? ` – K${item.price}` : item.monthly_rent ? ` – K${item.monthly_rent}/mo` : ""}
                </p>
                <ActionButtons type={contentType === "posts" ? "post" : contentType === "products" ? "product" : "accommodation"} item={item} />
              </div>
            ))}
          </div>
        )}

        {/* Verifications */}
        {activeTab === "verifications" && (
          <div className="space-y-2">
            {requests.length === 0 && <p className="text-xs text-muted">None</p>}
            {requests.map((req) => (
              <div key={req.id} className="card p-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{req.full_name}</p>
                  {req.id_document_url && <a href={req.id_document_url} target="_blank" className="text-xs text-blue-600 underline">View ID</a>}
                  {req.reason && <p className="text-[10px] text-muted">{req.reason}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-1 rounded-full ${req.status === "pending" ? "bg-yellow-100" : req.status === "approved" ? "bg-green-100" : "bg-red-100"}`}>{req.status}</span>
                  {req.status === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => handleApprove(req)} className="text-[10px] px-2 py-1 bg-green-500 text-white rounded">Approve</button>
                      <button onClick={() => handleReject(req)} className="text-[10px] px-2 py-1 bg-red-500 text-white rounded">Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reports */}
        {activeTab === "reports" && (
          <div className="space-y-2">
            {reports.length === 0 && <p className="text-xs text-muted">None</p>}
            {reports.map((r) => (
              <div key={r.id} className="card p-2 flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{r.reporter?.full_name || "System"} reported a {r.content_type}</p>
                    <p className="text-xs text-muted break-words font-semibold mt-1">{r.reason}</p>
                    {r.content_snapshot && (
                      <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">
                        {typeof r.content_snapshot === 'string' ? r.content_snapshot : JSON.stringify(r.content_snapshot, null, 2)}
                      </div>
                    )}
                    <p className="text-[10px] text-muted mt-1">Status: {r.status || "pending"}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 flex-wrap">
                    <button onClick={() => handleReportAction(r.id, "reviewed")} className="text-[10px] px-2 py-1 rounded bg-yellow-100 text-yellow-800">Review</button>
                    <button onClick={() => handleReportAction(r.id, "resolved")} className="text-[10px] px-2 py-1 rounded bg-green-100 text-green-800">Resolve</button>
                    {r.content_type !== "user" && (
                      <>
                        <button onClick={() => handleHide(r.content_type, r.content_id)} className="text-[10px] px-2 py-1 rounded bg-red-100 text-red-800">Hide</button>
                        <button onClick={() => handleDelete(r.content_type, r.content_id)} className="text-[10px] px-2 py-1 rounded bg-red-200 text-red-900">Delete</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {activeTab === "tags" && (
          <div className="space-y-3">
            <form onSubmit={handleCreateTag} className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Enter new tag name..."
                className="input-field text-xs flex-1"
              />
              <button
                type="submit"
                disabled={!newTagName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 transition-all"
              >
                + Add Tag
              </button>
            </form>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tags.map((tag) => (
                <div key={tag.id} className="card p-2.5 flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{tag.name}</span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-200 transition-colors shrink-0"
                    title="Delete Tag"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Password Resets Queue */}
        {activeTab === "resets" && (
          <div className="space-y-3">
            {resetReqs.length === 0 && <p className="text-xs text-muted p-4 text-center">No password recovery requests pending.</p>}
            {resetReqs.map((r) => (
              <div key={r.id} className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-slate-200 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{r.email}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Score: {r.score}/3 Verified
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      r.status === 'verified_pending_admin'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : r.status === 'approved'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Requested on: {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>

                {r.status === "verified_pending_admin" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        try {
                          await recoveryService.adminApproveReset(r.id);
                          setResetReqs((prev) => prev.map((item) => (item.id === r.id ? { ...item, status: "approved" } : item)));
                          toast.success("Approved & Reset email dispatched!");
                        } catch (e: any) {
                          toast.error(e.message || "Failed to approve");
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                    >
                      Approve & Send Email
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await recoveryService.adminRejectReset(r.id);
                          setResetReqs((prev) => prev.map((item) => (item.id === r.id ? { ...item, status: "rejected" } : item)));
                          toast.success("Request rejected");
                        } catch (e: any) {
                          toast.error(e.message || "Failed to reject");
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950 dark:text-red-300 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}
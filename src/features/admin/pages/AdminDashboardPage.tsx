import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { adminService } from "@/services/admin/adminService";
import { storageService } from "@/services/storage/storageService";
import { locationService, type LocationItem } from "@/services/locations/locationService";
import { verificationService } from "@/services/verification/verificationService";
import { recoveryService } from "@/services/auth/recoveryService";
import { useAuthStore } from "@/store/auth/authStore";
import { triggerNotification } from "@/services/notifications/triggerService";
import type { Tables } from "@/types/database/database.types";
import {
  Loader2, Search, Users, ShoppingBag, Building2, FileText, Star,
  EyeOff, Eye, Trash2, ShieldAlert, RotateCw,
  ShieldCheck, Tag as TagIcon, KeyRound, ExternalLink, AlertTriangle, MapPin, X, ZoomIn
} from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/hooks/useConfirm";

type Profile = Tables<"profiles">;
type VerificationRequest = Tables<"verification_requests">;
type Report = Tables<"reports"> & {
  reporter?: { full_name: string | null; avatar_url: string | null } | null;
};

const TABS = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
  { id: "content", label: "Content", icon: FileText },
  { id: "verifications", label: "Verifications", icon: ShieldCheck },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "reports", label: "Reports", icon: ShieldAlert },
  { id: "tags", label: "Tags", icon: TagIcon },
  { id: "resets", label: "Resets", icon: KeyRound },
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
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [resetReqs, setResetReqs] = useState<any[]>([]);
  
  const [newTagName, setNewTagName] = useState("");
  const [newLocName, setNewLocName] = useState("");
  const [newLocCity, setNewLocCity] = useState("Lusaka");
  const [newLocProvince, setNewLocProvince] = useState("Lusaka");
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "banned" | "admin" | "verified" | "landlord">("all");
  const [contentType, setContentType] = useState<"posts" | "products" | "accommodations">("posts");
  const [contentLoading, setContentLoading] = useState(false);

  // Inspector Modal State
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectReq, setInspectReq] = useState<VerificationRequest | null>(null);
  const [inspectStudentIdUrl, setInspectStudentIdUrl] = useState<string | null>(null);
  const [inspectNrcUrl, setInspectNrcUrl] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [inspectLoading, setInspectLoading] = useState(false);

  const withProcessing = (id: string, fn: (...args: any[]) => Promise<void>) => async (...args: any[]) => {
    if (processingIds.has(id)) return;
    setProcessingIds((p) => new Set(p).add(id));
    try { await fn(...args); }
    finally { setProcessingIds((p) => { const n = new Set(p); n.delete(id); return n; }); }
  };

  const loadAllData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [s, u, r, rp, t, rs, locs] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers(),
        verificationService.getAllRequests(),
        adminService.getReports(),
        adminService.getAllTags(),
        recoveryService.getRecoveryRequests(),
        locationService.getAllLocationsAdmin(),
      ]);
      setStats(s); setUsers(u); setRequests(r); setReports(rp); setTags(t); setResetReqs(rs); setLocations(locs);
      if (isManualRefresh) toast.success("Dashboard data refreshed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const openInspectorModal = async (req: VerificationRequest) => {
    setInspectReq(req);
    setInspectModalOpen(true);
    setInspectLoading(true);
    setInspectStudentIdUrl(null);
    setInspectNrcUrl(null);
    setRejectionReason("");

    try {
      if (req.id_document_url) {
        let url = req.id_document_url;
        if (!url.startsWith("http")) {
          url = await storageService.getSignedUrl("verification-documents", url);
        }
        setInspectStudentIdUrl(url);
      }
      if ((req as any).nrc_document_url) {
        let url = (req as any).nrc_document_url;
        if (!url.startsWith("http")) {
          url = await storageService.getSignedUrl("verification-documents", url);
        }
        setInspectNrcUrl(url);
      }
    } catch (e) {
      toast.error("Failed to generate secure document preview link");
    } finally {
      setInspectLoading(false);
    }
  };

  const handleCreateLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newLocName.trim()) return;
    try {
      await locationService.createLocation(newLocName.trim(), newLocProvince, newLocCity);
      setLocations(await locationService.getAllLocationsAdmin());
      setNewLocName("");
      toast.success("Location added successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add location");
    }
  };

  const handleDeleteLocation = async (id: string) => {
    const ok = await confirm({ title: "Delete location?", message: "Remove this location entry?" });
    if (!ok) return;
    try {
      await locationService.deleteLocation(id);
      setLocations((prev) => prev.filter((l) => l.id !== id));
      toast.success("Location deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete location");
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab !== "content") return;
    setContentLoading(true);
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
    }).catch((e) => toast.error(e?.message || "Failed to load content"))
    .finally(() => setContentLoading(false));
  }, [activeTab, contentType, search]);

  const err = (e: any) => toast.error(e?.message || "Error");
  
  const refreshContent = async () => {
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
      await triggerNotification.system(req.user_id, "Verification Approved ✅", "Your account has been verified!", "/profile");
      toast.success("Verification approved!");
    } catch (e) { err(e); }
  };

  const handleReject = async (req: VerificationRequest) => {
    if (!user) return;
    try {
      await verificationService.rejectRequest(req.id, user.id);
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: "rejected" } : r)));
      await triggerNotification.system(req.user_id, "Verification Rejected ❌", "Your verification document was rejected.", "/profile");
      toast.success("Verification rejected");
    } catch (e) { err(e); }
  };

  const handleReportAction = async (id: string, action: "reviewed" | "resolved") => {
    try {
      await adminService.updateReportStatus(id, action);
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: action } : r)));
      toast.success(`Report marked as ${action}`);
    } catch (e) { err(e); }
  };

  const handleDeleteReport = async (id: string) => {
    const ok = await confirm({ title: "Delete Report?", message: "Permanently delete this report record?" });
    if (!ok) return;
    try {
      await adminService.deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("Report deleted");
    } catch (e) { err(e); }
  };

  const handleHide = async (type: string, id: string) => {
    try {
      if (type === "post") await adminService.hidePost(id, true);
      else if (type === "product") await adminService.hideProduct(id, true);
      else await adminService.hideAccommodation(id, true);
      toast.success("Item hidden from public feed");
      refreshContent();
    } catch (e) { err(e); }
  };

  const handleUnhide = async (type: string, id: string) => {
    try {
      if (type === "post") await adminService.hidePost(id, false);
      else if (type === "product") await adminService.hideProduct(id, false);
      else await adminService.hideAccommodation(id, false);
      toast.success("Item unhidden");
      refreshContent();
    } catch (e) { err(e); }
  };

  const handleDelete = async (type: string, id: string) => {
    const ok = await confirm({ title: "Permanently Delete?", message: `Hard delete this ${type}? This cannot be undone.` });
    if (!ok) return;
    try {
      if (type === "post") await adminService.hardDeletePost(id);
      else if (type === "product") await adminService.hardDeleteProduct(id);
      else await adminService.hardDeleteAccommodation(id);
      toast.success("Permanently deleted");
      refreshContent();
    } catch (e) { err(e); }
  };

  const queryClient = useQueryClient();

  const handleBan = async (userId: string, banned: boolean) => {
    const ok = await confirm({ title: banned ? "Unban User?" : "Ban User?", message: banned ? "Restore user access?" : "Suspend user access immediately?" });
    if (!ok) return;
    try {
      await adminService.toggleBanUser(userId, !banned);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_banned: !banned } : u)));
      
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      toast.success(banned ? "User unbanned" : "User suspended");
    } catch (e) { err(e); }
  };

  const handleRole = async (userId: string, field: string, current: boolean) => {
    const ok = await confirm({ title: `Toggle ${field.replace('is_', '')}?`, message: `Change user role status?` });
    if (!ok) return;
    try {
      await supabase.from("profiles").update({ [field]: !current } as any).eq("id", userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, [field]: !current } : u)));
      toast.success("Role updated");
    } catch (e) { err(e); }
  };

  const handleFeature = async (type: string, id: string, featured: boolean) => {
    try {
      await adminService.updateContentFeatured(type, id, !featured);
      if (type === "post") setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, featured: !featured } : p)));
      else if (type === "product") setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, featured: !featured } : p)));
      else setAccommodations((prev) => prev.map((a) => (a.id === id ? { ...a, featured: !featured } : a)));
      toast.success(featured ? "Removed from featured" : "Added to featured");
    } catch (e) { err(e); }
  };

  const handleCreateTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      await adminService.createTag(newTagName.trim());
      setTags(await adminService.getAllTags());
      setNewTagName("");
      toast.success("Tag created successfully");
    } catch (e) { err(e); }
  };

  const handleDeleteTag = async (id: string) => {
    const ok = await confirm({ title: "Delete tag?", message: "Permanently remove this tag?" });
    if (!ok) return;
    try {
      await adminService.deleteTag(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tag deleted");
    } catch (e) { err(e); }
  };

  if (loading)
    return <div className="flex justify-center items-center py-32"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const pendingResetCount = resetReqs.filter((r) => r.status === "verified_pending_admin").length;
  const pendingVerificationCount = requests.filter((r) => r.status === "pending").length;
  const pendingReportCount = reports.filter((r) => !r.status || r.status === "pending").length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch = (u.full_name || "").toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (userRoleFilter === "banned") return u.is_banned;
    if (userRoleFilter === "admin") return u.is_admin;
    if (userRoleFilter === "verified") return u.is_verified;
    if (userRoleFilter === "landlord") return u.is_landlord;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Top Console Bar */}
      <div className="sticky top-0 z-20 bg-surface border-b border-border px-4 py-3 shadow-2xs">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="text-primary" size={18} /> Admin Console
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">System management & content moderation</p>
          </div>
          <button
            onClick={() => loadAllData(true)}
            disabled={refreshing}
            className="btn-ghost text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0"
          >
            <RotateCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count =
              t.id === "resets"
                ? pendingResetCount
                : t.id === "verifications"
                ? pendingVerificationCount
                : t.id === "reports"
                ? pendingReportCount
                : 0;

            const isActive = activeTab === t.id;

            return (
              <button
                key={t.id}
                onClick={() => setSearchParams({ tab: t.id })}
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 border ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-surface text-slate-700 dark:text-slate-300 border-border hover:border-slate-300"
                }`}
              >
                <Icon size={13} />
                <span>{t.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white text-blue-700" : "bg-red-500 text-white"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-7xl mx-auto w-full">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Users, label: "Total Users", value: stats?.totalUsers, color: "#2563eb", bg: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" },
                { icon: ShoppingBag, label: "Market Products", value: stats?.totalProducts, color: "#059669", bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" },
                { icon: Building2, label: "Accommodations", value: stats?.totalAccommodations, color: "#d97706", bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" },
                { icon: FileText, label: "Feed Posts", value: stats?.totalPosts, color: "#7c3aed", bg: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400" },
                { icon: AlertTriangle, label: "Pending Reports", value: stats?.pendingReports, color: "#dc2626", bg: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" },
                { icon: ShieldAlert, label: "Verifications", value: stats?.pendingVerifications, color: "#0284c7", bg: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400" },
                { icon: ShoppingBag, label: "Escrow Deals", value: stats?.totalEscrows, color: "#0891b2", bg: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400" },
                { icon: Users, label: "Banned Users", value: stats?.totalBanned, color: "#e11d48", bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400" },
              ].map((stat, idx) => (
                <div key={idx} className="card p-3 flex items-center gap-3 border border-border bg-surface shadow-2xs hover:shadow-xs transition-shadow">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                    <stat.icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{stat.value ?? 0}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Registrations */}
            <div className="card p-4 border border-border bg-surface rounded-2xl shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Users size={16} className="text-primary" /> Recent Member Registrations
              </h3>
              <div className="divide-y divide-border">
                {stats?.recentUsers.map((u: any) => (
                  <div key={u.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {u.full_name?.[0] || u.email?.[0] || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{u.full_name || "Anonymous User"}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400">{new Date(u.created_at).toLocaleDateString()}</span>
                      <button
                        onClick={() => { setSearchParams({ tab: "users" }); setSearch(u.email); }}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Management Tab */}
        {activeTab === "users" && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  className="input-field pl-9 text-xs"
                  placeholder="Search user by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Role filter pills */}
              <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar shrink-0">
                {(["all", "banned", "admin", "verified", "landlord"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUserRoleFilter(r)}
                    className={`text-xs px-3 py-1.5 rounded-full capitalize font-medium transition-all shrink-0 border ${
                      userRoleFilter === r
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs"
                        : "bg-surface text-slate-600 dark:text-slate-300 border-border hover:border-slate-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="card p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No users found matching your search.
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div key={u.id} className="card p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-border bg-surface hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                          {u.full_name?.[0] || u.email?.[0] || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{u.full_name || "Unnamed User"}</p>
                          {u.is_banned && <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">BANNED</span>}
                          {u.is_admin && <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">ADMIN</span>}
                          {u.is_verified && <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">VERIFIED</span>}
                          {u.is_landlord && <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">LANDLORD</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap shrink-0 justify-end">
                      {processingIds.has(u.id) ? (
                        <div className="flex items-center justify-center w-24 py-1">
                          <Loader2 size={16} className="animate-spin text-muted" />
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => withProcessing(u.id, async () => handleBan(u.id, u.is_banned ?? false))()}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                              u.is_banned
                                ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-950 dark:text-red-300"
                            }`}
                          >
                            {u.is_banned ? "Unban" : "Ban"}
                          </button>
                          <button
                            onClick={() => withProcessing(u.id, async () => handleRole(u.id, "is_admin", u.is_admin))()}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                              u.is_admin
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-surface border-border text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            Admin
                          </button>
                          <button
                            onClick={() => withProcessing(u.id, async () => handleRole(u.id, "is_verified", u.is_verified))()}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                              u.is_verified
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-surface border-border text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => withProcessing(u.id, async () => handleRole(u.id, "is_landlord", u.is_landlord ?? false))()}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                              u.is_landlord
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-surface border-border text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            Landlord
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Content Management Tab */}
        {activeTab === "content" && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  className="input-field pl-9 text-xs"
                  placeholder={`Search ${contentType}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-full border border-border shrink-0">
                {(["posts", "products", "accommodations"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setContentType(t)}
                    className={`text-xs px-3.5 py-1 rounded-full capitalize font-medium transition-all ${
                      contentType === t
                        ? "bg-primary text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {contentLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={24} /></div>
            ) : (
              <div className="space-y-2">
                {(contentType === "posts" ? posts : contentType === "products" ? products : accommodations).length === 0 ? (
                  <div className="card p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                    No {contentType} found.
                  </div>
                ) : (
                  (contentType === "posts" ? posts : contentType === "products" ? products : accommodations).map((item) => {
                    const detailPath = contentType === "posts" ? `/post/${item.id}` : contentType === "products" ? `/marketplace/${item.id}` : `/accommodation/${item.id}`;
                    const imageUrl = item.image_url || item.images?.[0] || null;
                    const author = item.profiles;

                    return (
                      <div key={item.id} className={`card p-3 flex flex-col sm:flex-row items-start justify-between gap-3 border border-border bg-surface ${item.is_hidden ? 'opacity-60 bg-red-50/20 dark:bg-red-950/10' : ''}`}>
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {imageUrl ? (
                            <img src={imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border" />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                              <FileText size={20} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              {item.is_hidden && <span className="text-[10px] px-2 py-0.2 rounded font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">HIDDEN</span>}
                              {item.featured && <span className="text-[10px] px-2 py-0.2 rounded font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">FEATURED</span>}
                              {item.price && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">K{item.price}</span>}
                              {item.monthly_rent && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">K{item.monthly_rent}/mo</span>}
                            </div>
                            <p className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                              {contentType === "posts" ? item.content : item.title}
                            </p>
                            {author && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                <span>by <strong className="text-slate-700 dark:text-slate-300">{author.full_name || author.email}</strong></span>
                              </p>
                            )}
                            <a href={detailPath} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline font-semibold mt-1 inline-flex items-center gap-1">
                              View live <ExternalLink size={10} />
                            </a>
                          </div>
                        </div>

                        {processingIds.has(item.id) ? (
                          <div className="flex items-center justify-center w-20 py-2"><Loader2 size={16} className="animate-spin text-muted" /></div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                            <button
                              onClick={() => withProcessing(item.id, async () => handleFeature(contentType === "posts" ? "post" : contentType === "products" ? "product" : "accommodation", item.id, item.featured))()}
                              className={`p-2 rounded-full transition-colors ${item.featured ? "bg-amber-400 text-slate-900 shadow-2xs" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-amber-500"}`}
                              title={item.featured ? "Unfeature" : "Feature"}
                            >
                              <Star size={14} fill={item.featured ? "currentColor" : "none"} />
                            </button>
                            <button
                              onClick={() => withProcessing(item.id, async () => item.is_hidden ? handleUnhide(contentType === "posts" ? "post" : contentType === "products" ? "product" : "accommodation", item.id) : handleHide(contentType === "posts" ? "post" : contentType === "products" ? "product" : "accommodation", item.id))()}
                              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                              title={item.is_hidden ? "Unhide" : "Hide"}
                            >
                              {item.is_hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button
                              onClick={() => withProcessing(item.id, async () => handleDelete(contentType === "posts" ? "post" : contentType === "products" ? "product" : "accommodation", item.id))()}
                              className="p-2 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Verification Requests Tab */}
        {activeTab === "verifications" && (
          <div className="space-y-2">
            {requests.length === 0 ? (
              <div className="card p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                No verification requests pending.
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-border bg-surface rounded-2xl shadow-2xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{req.full_name}</p>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase ${
                        req.status === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
                        req.status === "approved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 mb-2">
                      {(req as any).student_id_number && <p><span className="font-semibold text-slate-700 dark:text-slate-300">Student ID #:</span> {(req as any).student_id_number}</p>}
                      {(req as any).nrc_number && <p><span className="font-semibold text-slate-700 dark:text-slate-300">NRC #:</span> {(req as any).nrc_number}</p>}
                      {req.reason && <p className="italic">"{req.reason}"</p>}
                    </div>

                    <button
                      type="button"
                      onClick={() => openInspectorModal(req)}
                      className="btn-ghost text-xs px-3 py-1.5 rounded-full font-bold border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 inline-flex items-center gap-1.5"
                    >
                      <Eye size={14} /> Inspect Documents & Profile
                    </button>
                  </div>

                  {req.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      {processingIds.has(req.id) ? (
                        <Loader2 size={16} className="animate-spin text-muted" />
                      ) : (
                        <>
                          <button
                            onClick={() => openInspectorModal(req)}
                            className="btn-primary text-xs px-4 py-2 rounded-full font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                          >
                            Review & Decide
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Locations Management Tab */}
        {activeTab === "locations" && (
          <div className="space-y-4">
            {/* Add Location Form */}
            <form onSubmit={handleCreateLocation} className="card p-4 border border-border bg-surface rounded-2xl shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <MapPin size={15} className="text-primary" /> Add New Student Location / Campus Hub
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    className="input-field text-xs"
                    placeholder="e.g. Lusaka - Mass Media / ZAMCOM"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                  />
                </div>
                <div>
                  <select
                    className="input-field text-xs cursor-pointer"
                    value={newLocProvince}
                    onChange={(e) => {
                      setNewLocProvince(e.target.value);
                      setNewLocCity(e.target.value === "Lusaka" ? "Lusaka" : "Kitwe");
                    }}
                  >
                    <option value="Lusaka">Lusaka Province</option>
                    <option value="Copperbelt">Copperbelt Province</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary text-xs px-4 py-2 rounded-full font-bold shadow-xs">
                  + Add Location
                </button>
              </div>
            </form>

            {/* Locations List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {locations.map((loc) => (
                <div key={loc.id || loc.name} className="card p-3.5 border border-border bg-surface rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{loc.name}</p>
                    <p className="text-[10px] text-slate-500">{loc.province || "Lusaka Province"}</p>
                  </div>
                  {loc.id && (
                    <button
                      onClick={() => handleDeleteLocation(loc.id!)}
                      className="p-1.5 rounded-full hover:bg-red-50 text-red-500 dark:hover:bg-red-950/50 transition-colors shrink-0"
                      title="Delete Location"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verification Document High-Res Inspector Modal */}
        {inspectModalOpen && inspectReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-surface border border-border rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="text-primary" size={18} /> Verification Application Inspector
                  </h2>
                  <p className="text-xs text-slate-500">Applicant: <span className="font-bold text-slate-800 dark:text-slate-200">{inspectReq.full_name}</span></p>
                </div>
                <button onClick={() => setInspectModalOpen(false)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Details Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-border text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Student / Staff ID #</span>
                    <span className="font-bold text-slate-900 dark:text-white">{(inspectReq as any).student_id_number || "Not provided"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">NRC / Passport #</span>
                    <span className="font-bold text-slate-900 dark:text-white">{(inspectReq as any).nrc_number || "Not provided"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Submitted Date</span>
                    <span className="font-bold text-slate-900 dark:text-white">{new Date(inspectReq.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>

                {inspectLoading ? (
                  <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Document 1: Student ID */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>1. Student ID Card / Admission Letter</span>
                        {inspectStudentIdUrl && (
                          <a href={inspectStudentIdUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-[11px] flex items-center gap-1">
                            <ZoomIn size={12} /> High-Res Fullscreen
                          </a>
                        )}
                      </p>
                      {inspectStudentIdUrl ? (
                        <div className="rounded-2xl overflow-hidden border border-border bg-black/90 p-2 flex items-center justify-center min-h-[220px]">
                          <img src={inspectStudentIdUrl} alt="Student ID Document" className="max-h-72 object-contain rounded-lg" />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-xs text-slate-400">
                          No Student ID image provided
                        </div>
                      )}
                    </div>

                    {/* Document 2: NRC Card */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>2. National Registration Card (NRC)</span>
                        {inspectNrcUrl && (
                          <a href={inspectNrcUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-[11px] flex items-center gap-1">
                            <ZoomIn size={12} /> High-Res Fullscreen
                          </a>
                        )}
                      </p>
                      {inspectNrcUrl ? (
                        <div className="rounded-2xl overflow-hidden border border-border bg-black/90 p-2 flex items-center justify-center min-h-[220px]">
                          <img src={inspectNrcUrl} alt="NRC Document" className="max-h-72 object-contain rounded-lg" />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-xs text-slate-400">
                          No NRC image provided
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              {inspectReq.status === "pending" && (
                <div className="px-5 py-4 border-t border-border bg-surface flex flex-col sm:flex-row items-center justify-between gap-3">
                  <input
                    type="text"
                    className="input-field text-xs flex-1"
                    placeholder="Optional rejection reason / note..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        try {
                          await handleReject(inspectReq);
                          setInspectModalOpen(false);
                        } catch (e: any) {
                          toast.error(e?.message || "Failed to reject");
                        }
                      }}
                      className="btn-ghost text-xs px-4 py-2 rounded-full font-bold border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await handleApprove(inspectReq);
                          setInspectModalOpen(false);
                        } catch (e: any) {
                          toast.error(e?.message || "Failed to approve");
                        }
                      }}
                      className="btn-primary text-xs px-5 py-2 rounded-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                    >
                      Approve & Verify Badge
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="card p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                No reported content.
              </div>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="card p-4 flex flex-col gap-3 border border-border bg-surface">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {r.reporter?.full_name || "System"}
                        </span>
                        <span className="text-xs text-slate-500">reported a</span>
                        <span className="text-xs font-bold uppercase text-primary">{r.content_type}</span>
                        <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ml-auto ${
                          r.status === "resolved" ? "bg-emerald-100 text-emerald-800" :
                          r.status === "reviewed" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {r.status || "pending"}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                        Reason: {r.reason}
                      </p>

                      {r.content_snapshot && (
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-slate-700 dark:text-slate-300 border border-border">
                          {typeof r.content_snapshot === 'object' && r.content_snapshot !== null ? (
                            <div className="space-y-1">
                              {r.content_type === "post" && (
                                <p className="italic">"{(r.content_snapshot as any).content}"</p>
                              )}
                              {r.content_type !== "post" && (
                                <>
                                  <p className="font-bold text-slate-900 dark:text-slate-100">{(r.content_snapshot as any).title}</p>
                                  {((r.content_snapshot as any).price || (r.content_snapshot as any).monthly_rent) && (
                                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                                      K{(r.content_snapshot as any).price || (r.content_snapshot as any).monthly_rent}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="break-words whitespace-pre-wrap">{String(r.content_snapshot)}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end pt-2 border-t border-border">
                    {processingIds.has(r.id) ? (
                      <Loader2 size={16} className="animate-spin text-muted" />
                    ) : (
                      <>
                        <button onClick={() => withProcessing(r.id, async () => handleReportAction(r.id, "reviewed"))()} className="text-xs px-2.5 py-1 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-medium">Review</button>
                        <button onClick={() => withProcessing(r.id, async () => handleReportAction(r.id, "resolved"))()} className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium">Resolve</button>
                        <button onClick={() => withProcessing(r.id, async () => handleDeleteReport(r.id))()} className="text-xs px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 font-medium">Delete Report</button>
                        
                        {r.content_type !== "user" && r.content_id && (
                          <>
                            <button onClick={() => withProcessing(r.id, async () => handleHide(r.content_type, r.content_id))()} className="text-xs px-2.5 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium">Hide Item</button>
                            <button onClick={() => withProcessing(r.id, async () => handleDelete(r.content_type, r.content_id))()} className="text-xs px-2.5 py-1 rounded-full bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-950 dark:text-red-300 font-medium">Delete Item</button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tags Tab */}
        {activeTab === "tags" && (
          <div className="space-y-4">
            <form onSubmit={handleCreateTag} className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Enter new tag name (e.g. electronics, housing, books)..."
                className="input-field text-xs flex-1"
              />
              <button
                type="submit"
                disabled={!newTagName.trim()}
                className="btn-primary text-xs px-4 py-2 rounded-full font-bold shrink-0 disabled:opacity-50"
              >
                + Add Tag
              </button>
            </form>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {tags.map((tag) => (
                <div key={tag.id} className="card p-2.5 flex items-center justify-between gap-2 border border-border bg-surface">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">#{tag.name}</span>
                  {processingIds.has(tag.id) ? (
                    <Loader2 size={13} className="animate-spin text-muted" />
                  ) : (
                    <button
                      onClick={() => withProcessing(tag.id, async () => handleDeleteTag(tag.id))()}
                      className="p-1 rounded-full hover:bg-red-100 text-red-600 dark:hover:bg-red-950 transition-colors shrink-0"
                      title="Delete Tag"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Password Resets Queue Tab */}
        {activeTab === "resets" && (
          <div className="space-y-3">
            {resetReqs.length === 0 ? (
              <div className="card p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                No password recovery requests pending.
              </div>
            ) : (
              resetReqs.map((r) => (
                <div key={r.id} className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-border bg-surface">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{r.email}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Score: {r.score}/3 Verified
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        r.status === 'verified_pending_admin' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        r.status === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
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
                      {processingIds.has(r.id) ? (
                        <Loader2 size={16} className="animate-spin text-muted" />
                      ) : (
                        <>
                          <button
                            onClick={() => withProcessing(r.id, async () => {
                              try {
                                await recoveryService.adminApproveReset(r.id);
                                setResetReqs((prev) => prev.map((item) => (item.id === r.id ? { ...item, status: "approved" } : item)));
                                toast.success("Approved & Reset email dispatched!");
                              } catch (e: any) {
                                toast.error(e.message || "Failed to approve");
                              }
                            })()}
                            className="btn-primary text-xs px-3 py-1.5 rounded-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          >
                            Approve & Send Email
                          </button>
                          <button
                            onClick={() => withProcessing(r.id, async () => {
                              try {
                                await recoveryService.adminRejectReset(r.id);
                                setResetReqs((prev) => prev.map((item) => (item.id === r.id ? { ...item, status: "rejected" } : item)));
                                toast.success("Request rejected");
                              } catch (e: any) {
                                toast.error(e.message || "Failed to reject");
                              }
                            })()}
                            className="text-xs px-3 py-1.5 rounded-full font-semibold bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950 dark:text-red-300"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}
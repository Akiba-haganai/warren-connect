import { useEffect, useState } from "react";
import { adminService } from "@/services/admin/adminService";
import { verificationService } from "@/services/verification/verificationService";
import { useAuthStore } from "@/store/auth/authStore";
import { triggerNotification } from "@/services/notifications/triggerService";
import FeatureProgressBar from "@/components/ui/FeaturesProgressBar";    // ✅ new
import type { Tables } from "@/types/database/database.types";
import {
  ShieldAlert,
  UserX,
  EyeOff,
  CheckCircle,
  Loader2,
  Trash2
} from "lucide-react";

type Profile = Tables<"profiles">;
type VerificationRequest = Tables<"verification_requests">;
type Report = Tables<"reports"> & {
  reporter?: { full_name: string | null; avatar_url: string | null } | null;
};

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<"reports" | "verifications" | "users">("reports");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminService.getUsers(),
      verificationService.getAllRequests(),
      adminService.getReports(),
    ])
      .then(([u, r, rep]) => {
        setUsers(u);
        setRequests(r);
        setReports(rep);
      })
      .finally(() => setLoading(false));
  }, []);

  // Verification handlers
  const handleApprove = async (request: VerificationRequest) => {
    if (!user) return;
    await verificationService.approveRequest(request.id, user.id, request.user_id);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === request.id ? { ...r, status: "approved", reviewed_by: user.id } : r
      )
    );
    setUsers((prev) =>
      prev.map((u) => (u.id === request.user_id ? { ...u, is_verified: true } : u))
    );
    await triggerNotification.accommodationInterest(
      request.user_id,
      request.id,
      "Verification Approved ✅",
      "Your verification request has been approved."
    );
  };

  const handleReject = async (request: VerificationRequest) => {
    if (!user) return;
    await verificationService.rejectRequest(request.id, user.id);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === request.id ? { ...r, status: "rejected", reviewed_by: user.id } : r
      )
    );
    await triggerNotification.accommodationInterest(
      request.user_id,
      request.id,
      "Verification Rejected ❌",
      "Your verification request was not approved."
    );
  };

  // Report handlers
  const handleReportAction = async (reportId: string, action: "reviewed" | "resolved") => {
    await adminService.updateReportStatus(reportId, action);
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: action } : r))
    );
  };

  const handleDeleteContent = async (type: string, id: string) => {
    if (!confirm(`Permanently delete this ${type}? This cannot be undone.`)) return;
    try {
      if (type === "post") await adminService.deletePost(id);
      else if (type === "product") await adminService.deleteProduct(id);
      else if (type === "accommodation") await adminService.deleteAccommodation(id);
      alert(`${type} deleted.`);
      adminService.getReports().then(setReports);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleHideContent = async (type: string, id: string) => {
    if (type === "post") await adminService.hidePost(id, true);
    else if (type === "product") await adminService.hideProduct(id, true);
    else if (type === "accommodation") await adminService.hideAccommodation(id, true);
    alert(`${type} hidden.`);
  };

  // User ban
  const handleBanUser = async (userId: string, currentlyBanned: boolean) => {
    await adminService.toggleBanUser(userId, !currentlyBanned);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_banned: !currentlyBanned } : u))
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
        Admin Dashboard
      </h1>

      {/* ===== PROJECT COMPLETION PROGRESS ===== */}
      <FeatureProgressBar />

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["reports", "verifications", "users"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              tab === t ? "bg-primary text-white" : "bg-gray-200 dark:bg-gray-700"
            }`}
            style={
              tab === t
                ? { background: "var(--color-primary)", color: "white" }
                : { background: "var(--color-border)", color: "var(--color-text)" }
            }
          >
            {t === "reports" && `Reports (${reports.length})`}
            {t === "verifications" && `Verifications (${requests.length})`}
            {t === "users" && `Users (${users.length})`}
          </button>
        ))}
      </div>

      {/* Reports */}
      {tab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 && (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No reports yet.
            </p>
          )}
          {reports.map((report) => (
            <div key={report.id} className="card p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    {report.reporter?.full_name || "Unknown"} reported a {report.content_type}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {report.reason}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                    Status: {report.status || "pending"}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleReportAction(report.id, "reviewed")}
                    className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800"
                  >
                    <ShieldAlert size={12} /> Review
                  </button>
                  <button
                    onClick={() => handleReportAction(report.id, "resolved")}
                    className="text-xs px-2 py-1 rounded bg-green-100 text-green-800"
                  >
                    <CheckCircle size={12} /> Resolve
                  </button>
                  <button
                    onClick={() => handleHideContent(report.content_type, report.content_id)}
                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-800"
                  >
                    <EyeOff size={12} /> Hide
                  </button>
                  <button
                    onClick={() => handleDeleteContent(report.content_type, report.content_id)}
                    className="text-xs px-2 py-1 rounded bg-red-200 text-red-900"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Requests */}
      {tab === "verifications" && (
        <div className="space-y-3">
          {requests.length === 0 && (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No verification requests yet.
            </p>
          )}
          {requests.map((req) => (
            <div key={req.id} className="card p-4 space-y-2">
              <div className="flex justify-between">
                <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                  {req.full_name}
                </p>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    req.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : req.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {req.status}
                </span>
              </div>
              {req.id_document_url && (
                <a
                  href={req.id_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm underline block"
                >
                  View ID Document
                </a>
              )}
              {req.reason && (
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {req.reason}
                </p>
              )}
              {req.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(req)}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(req)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="card p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                  {u.full_name || u.username || u.email}
                </p>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {u.email}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  Admin: {u.is_admin ? "Yes" : "No"} · Verified: {u.is_verified ? "Yes" : "No"} · Banned: {u.is_banned ? "Yes" : "No"}
                </p>
              </div>
              <button
                onClick={() => handleBanUser(u.id, u.is_banned ?? false)}
                className={`text-xs px-3 py-1 rounded ${
                  u.is_banned ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                <UserX size={12} /> {u.is_banned ? "Unban" : "Ban"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
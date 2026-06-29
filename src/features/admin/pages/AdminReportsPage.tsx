import { useEffect, useState } from "react";
import { adminService } from "@/services/admin/adminService";
import type { Tables } from "@/types/database/database.types";
import { Loader2, ShieldAlert, CheckCircle, EyeOff, Trash2 } from "lucide-react";

type Report = Tables<"reports"> & { reporter?: { full_name: string | null; avatar_url: string | null } | null };

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getReports().then(setReports).finally(() => setLoading(false));
  }, []);

  const handleReportAction = async (reportId: string, action: "reviewed" | "resolved") => {
    await adminService.updateReportStatus(reportId, action);
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: action } : r))
    );
  };

  const handleHideContent = async (type: string, id: string) => {
    if (type === "post") await adminService.hidePost(id, true);
    else if (type === "product") await adminService.hideProduct(id, true);
    else if (type === "accommodation") await adminService.hideAccommodation(id, true);
    alert(`${type} hidden.`);
  };

  const handleDeleteContent = async (type: string, id: string) => {
    if (!confirm(`Permanently delete this ${type}?`)) return;
    try {
      if (type === "post") await adminService.deletePost(id);
      else if (type === "product") await adminService.deleteProduct(id);
      else if (type === "accommodation") await adminService.deleteAccommodation(id);
      alert(`${type} deleted.`);
    } catch (err: any) { alert(err.message); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Reports</h1>
      {reports.length === 0 && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No reports yet.</p>
      )}
      {reports.map((report) => (
        <div key={report.id} className="card p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {report.reporter?.full_name || "Unknown"} reported a {report.content_type}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{report.reason}</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Status: {report.status || "pending"}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleReportAction(report.id, "reviewed")} className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                <ShieldAlert size={12} /> Review
              </button>
              <button onClick={() => handleReportAction(report.id, "resolved")} className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                <CheckCircle size={12} /> Resolve
              </button>
              {report.content_type !== "user" && (
                <>
                  <button onClick={() => handleHideContent(report.content_type, report.content_id)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                    <EyeOff size={12} /> Hide
                  </button>
                  <button onClick={() => handleDeleteContent(report.content_type, report.content_id)} className="text-xs px-2 py-1 rounded bg-red-200 text-red-900">
                    <Trash2 size={12} /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
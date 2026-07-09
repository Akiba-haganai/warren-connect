import { useEffect, useState } from "react";
import { verificationService } from "@/services/verification/verificationService";
import { useAuthStore } from "@/store/auth/authStore";
import { triggerNotification } from "@/services/notifications/triggerService";
import type { Tables } from "@/types/database/database.types";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

type VerificationRequest = Tables<"verification_requests">;

export default function AdminVerificationsPage() {
  const user = useAuthStore((s) => s.user);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const fetchSignedUrl = async (requestId: string, path: string) => {
    const { data, error } = await supabase.storage
      .from("verification-docs")
      .createSignedUrl(path, 300);
    if (!error && data) {
      setSignedUrls(prev => ({ ...prev, [requestId]: data.signedUrl }));
    }
  };

  useEffect(() => {
    if (!user) return;
    verificationService.getAllRequests().then(async (data) => {
      if (data) {
        setRequests(data);
        const userIds = data.map(r => r.user_id);
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds);
        const map: Record<string, any> = {};
        profiles?.forEach(p => { map[p.id] = p; });
        setUsers(map);

        data.forEach(r => {
          const path = (r as any).image_url || r.id_document_url;
          if (path && !path.startsWith("http")) {
            fetchSignedUrl(r.id, path);
          }
        });
      }
      setLoading(false);
    });
  }, [user]);

  const handleApprove = async (request: VerificationRequest) => {
    if (!user) return;
    await verificationService.approveRequest(request.id, user.id, request.user_id);
    setRequests((prev) =>
      prev.map((r) => (r.id === request.id ? { ...r, status: "approved", reviewed_by: user.id } : r))
    );
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
    setRequests((prev) =>
      prev.map((r) => (r.id === request.id ? { ...r, status: "rejected", reviewed_by: user.id } : r))
    );
    await triggerNotification.system(
      request.user_id,
      "Verification Rejected ❌",
      "Your verification request was not approved.",
      "/profile"
    );
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Verification Requests</h1>
      {requests.length === 0 && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No verification requests yet.</p>
      )}
      {requests.map((req) => (
        <div key={req.id} className="card p-4 space-y-2">
          <div className="flex justify-between">
            <p className="font-semibold" style={{ color: "var(--color-text)" }}>{req.full_name}</p>
            <span className={`text-xs px-2 py-1 rounded-full ${
              req.status === "pending" ? "bg-yellow-100 text-yellow-800" :
              req.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}>{req.status}</span>
          </div>

          {users[req.user_id] && (
            <div className="text-xs text-slate-500 mt-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
              <p><strong>Name:</strong> {users[req.user_id].full_name}</p>
              <p><strong>University:</strong> {users[req.user_id].university || "N/A"}</p>
              <p><strong>Course:</strong> {users[req.user_id].course || "N/A"}</p>
              <p><strong>Year:</strong> {users[req.user_id].year_of_study || "N/A"}</p>
            </div>
          )}

          {(() => {
            const path = (req as any).image_url || req.id_document_url;
            if (!path) return null;
            if (path.startsWith("http")) {
              return (
                <a href={path} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline block mt-2">
                  View ID Document
                </a>
              );
            }
            if (!signedUrls[req.id]) {
              return <p className="text-xs text-slate-500 mt-2">Loading image...</p>;
            }
            return (
              <img src={signedUrls[req.id]} alt="ID" className="max-h-48 rounded-lg mt-2 border border-slate-200 dark:border-slate-700" />
            );
          })()}
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
  );
}
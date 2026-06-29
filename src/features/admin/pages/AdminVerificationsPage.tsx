import { useEffect, useState } from "react";
import { verificationService } from "@/services/verification/verificationService";
import { useAuthStore } from "@/store/auth/authStore";
import { triggerNotification } from "@/services/notifications/triggerService";
import type { Tables } from "@/types/database/database.types";
import { Loader2 } from "lucide-react";

type VerificationRequest = Tables<"verification_requests">;

export default function AdminVerificationsPage() {
  const user = useAuthStore((s) => s.user);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificationService.getAllRequests().then(setRequests).finally(() => setLoading(false));
  }, []);

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
          {req.id_document_url && (
            <a href={req.id_document_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline block">
              View ID Document
            </a>
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
  );
}
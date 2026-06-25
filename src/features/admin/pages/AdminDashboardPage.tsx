import { useEffect, useState } from "react";
import { adminService } from "@/services/admin/adminService";
import { verificationService } from "@/services/verification/verificationService";
import { useAuthStore } from "@/store/auth/authStore";
import type { Tables } from "@/types/database/database.types";

type Profile = Tables<"profiles">;
type VerificationRequest = Tables<"verification_requests">;

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [tab, setTab] = useState<"users" | "verifications">("verifications");

  useEffect(() => {
    adminService.getUsers().then(setUsers).catch(console.error);
    verificationService.getAllRequests().then(setRequests).catch(console.error);
  }, []);

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
  };

  const handleReject = async (request: VerificationRequest) => {
    if (!user) return;
    await verificationService.rejectRequest(request.id, user.id);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === request.id ? { ...r, status: "rejected", reviewed_by: user.id } : r
      )
    );
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("verifications")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === "verifications" ? "bg-black text-white" : "bg-gray-200"
          }`}
        >
          Verifications ({requests.length})
        </button>
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === "users" ? "bg-black text-white" : "bg-gray-200"
          }`}
        >
          Users ({users.length})
        </button>
      </div>

      {/* Verification Requests */}
      {tab === "verifications" && (
        <div className="space-y-3">
          {requests.length === 0 && (
            <p className="text-sm text-gray-500">No verification requests yet.</p>
          )}
          {requests.map((req) => (
            <div key={req.id} className="border p-4 rounded bg-white space-y-2">
              <div className="flex justify-between">
                <p className="font-semibold">{req.full_name}</p>
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
              {req.reason && <p className="text-sm text-gray-500">{req.reason}</p>}
              {req.status === "pending" && (
                <div className="flex gap-2 mt-2">
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

      {/* Users List */}
      {tab === "users" && (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="border p-3 rounded bg-white">
              <p className="font-semibold">{u.full_name}</p>
              <p className="text-sm">{u.email}</p>
              <p className="text-xs mt-1">
                Admin: {u.is_admin ? "Yes" : "No"} · Verified: {u.is_verified ? "Yes" : "No"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth/authStore";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function AdminDeletionRequestsPage() {
  const user = useAuthStore(s => s.user);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("deletion_requests")
      .select("*, profiles(full_name, username)")
      .order("requested_at", { ascending: false })
      .then(({ data }) => { setRequests(data || []); setLoading(false); });
  }, [user]);

  const handleDelete = async (requestId: string, userId: string) => {
    if (!confirm("Permanently delete this user and ALL their data? This cannot be undone.")) return;
    const { error } = await supabase.rpc("delete_user_data", { p_user_id: userId });
    if (error) toast.error("Failed: " + error.message);
    else {
      await supabase.from("deletion_requests").update({ status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", requestId);
      toast.success("User deleted permanently.");
      setRequests(prev => prev.filter(r => r.id !== requestId));
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;
    const { error } = await supabase.from("deletion_requests")
      .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", requestId);
    if (error) {
      toast.error("Failed to reject");
    } else {
      setRequests(prev => prev.map(x => x.id === requestId ? { ...x, status: "rejected" } : x));
      toast.success("Rejected");
    }
  };

  if (!user) return <div className="p-4 text-center">Access Denied</div>;

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Account Deletion Requests</h1>
      {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> : requests.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No deletion requests.</p>
      ) : requests.map(r => (
        <div key={r.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-2">
          <p className="font-semibold" style={{ color: "var(--color-text)" }}>{r.profiles?.full_name || r.profiles?.username || "Unknown"}</p>
          <p className="text-xs text-slate-500 mt-1">{r.reason || "No reason provided"}</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Status: <span className="font-medium">{r.status}</span></p>
          {r.status === "pending" && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleDelete(r.id, r.user_id)} className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Delete User Data</button>
              <button onClick={() => handleReject(r.id)} className="px-3 py-1.5 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700">Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

import { useEffect, useState } from "react";
import { adminService } from "@/services/admin/adminService";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Search } from "lucide-react";

import type { Tables } from "@/types/database/database.types";

type Profile = Tables<"profiles">;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  const handleBanUser = async (userId: string, currentlyBanned: boolean) => {
    await adminService.toggleBanUser(userId, !currentlyBanned);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_banned: !currentlyBanned } : u)));
  };

  const handleToggleRole = async (userId: string, field: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ [field]: !current } as any).eq("id", userId);
    if (!error) setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, [field]: !current } : u)));
  };

  const filtered = users.filter((u) =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Users</h1>
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
        <input className="input-field pl-9" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {filtered.map((u) => (
        <div key={u.id} className="card p-4 space-y-2">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <p className="font-semibold text-sm">{u.full_name || u.email}</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{u.email}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleBanUser(u.id, u.is_banned ?? false)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                {u.is_banned ? "Unban" : "Ban"}
              </button>
              <button onClick={() => handleToggleRole(u.id, "is_admin", u.is_admin)} className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                {u.is_admin ? "Revoke Admin" : "Make Admin"}
              </button>
              <button onClick={() => handleToggleRole(u.id, "is_verified", u.is_verified)} className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                {u.is_verified ? "Unverify" : "Verify"}
              </button>
              <button onClick={() => handleToggleRole(u.id, "is_landlord", u.is_landlord ?? false)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                {u.is_landlord ? "Remove Landlord" : "Make Landlord"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
import { useEffect, useState } from "react";
import { adminService } from "@/services/admin/adminService";
import FeatureProgressBar from "@/components/ui/FeatureProgressBar";
import StatsCard from "@/features/admin/components/StatsCard";
import type { Tables } from "@/types/database/database.types";
import { Users, ShoppingBag, Building2, FileText, ShieldAlert, Loader2 } from "lucide-react";

type Profile = Tables<"profiles">;

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Overview</h1>
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
              <div>
                <p className="text-sm font-medium">{u.full_name || u.email}</p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{u.email}</p>
              </div>
            </div>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{new Date(u.created_at!).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
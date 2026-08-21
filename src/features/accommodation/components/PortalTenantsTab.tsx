import { useState, useEffect } from "react";
import { Users, UserPlus, Trash2, Calendar, Building2, Loader2 } from "lucide-react";
import type { Tables } from "@/types/database/database.types";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth/authStore";
import toast from "react-hot-toast";

type Accommodation = Tables<"accommodations">;

interface OfflineTenant {
  id: string;
  accommodation_id: string;
  name: string;
  phone: string | null;
  start_date: string;
}

interface Props {
  listings: Accommodation[];
}

export default function PortalTenantsTab({ listings }: Props) {
  const user = useAuthStore((s) => s.user);
  const [tenants, setTenants] = useState<OfflineTenant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchTenants = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("offline_tenants")
        .select("*")
        .eq("landlord_id", user.id)
        .order("created_at", { ascending: false });
        
      if (!error && data) {
        setTenants(data);
      }
      setLoading(false);
    };
    fetchTenants();
  }, [user]);

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId || !tenantName.trim() || !user) return;
    setSubmitting(true);

    try {
      const newTenant = {
        landlord_id: user.id,
        accommodation_id: selectedUnitId,
        name: tenantName.trim(),
        phone: tenantPhone.trim() || null,
        start_date: startDate || new Date().toISOString().split("T")[0],
      };

      const { data, error } = await (supabase as any)
        .from("offline_tenants")
        .insert(newTenant)
        .select()
        .single();

      if (error) throw error;

      setTenants([data, ...tenants]);
      toast.success("Tenant record registered!");
      setSelectedUnitId("");
      setTenantName("");
      setTenantPhone("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add tenant");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTenant = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("offline_tenants").delete().eq("id", id);
      if (error) throw error;
      
      setTenants(tenants.filter(t => t.id !== id));
      toast.success("Tenant record removed.");
    } catch (err: any) {
      toast.error("Failed to remove tenant");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Users size={16} className="text-primary" /> Tenant Registry
        </h3>
        <p className="text-xs text-slate-400">Keep track of active tenants across your rented units (synced to all your devices).</p>
      </div>

      {/* Add Tenant Form */}
      <form onSubmit={handleAddTenant} className="card p-4 space-y-3 bg-surface border border-border/80">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
          <UserPlus size={14} className="text-primary" /> Register Current Tenant
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="field-label text-[11px]">Select Unit / Property</label>
            <select
              required
              className="glass-select text-xs w-full"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
            >
              <option value="">Select rented space...</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} ({l.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label text-[11px]">Tenant Full Name</label>
            <input
              required
              type="text"
              className="input-field text-xs"
              placeholder="e.g. Chanda Mwape"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label text-[11px]">Phone Number (Optional)</label>
            <input
              type="tel"
              className="input-field text-xs"
              placeholder="e.g. +260 97..."
              value={tenantPhone}
              onChange={(e) => setTenantPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label text-[11px]">Lease Start Date</label>
            <input
              type="date"
              className="input-field text-xs"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary py-2 text-xs font-bold flex justify-center items-center">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : "Save Tenant Record"}
        </button>
      </form>

      {/* Active Tenants List */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Active Rented Units ({tenants.length})
        </h4>

        {tenants.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-1 py-4 text-center">
            No tenants registered yet. Select a unit above to add records.
          </p>
        ) : (
          tenants.map((t) => {
            const unit = listings.find((l) => l.id === t.accommodation_id);
            return (
              <div key={t.id} className="card p-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{t.name}</p>
                  <p className="text-[11px] text-primary font-semibold truncate flex items-center gap-1">
                    <Building2 size={11} /> {unit?.title ?? "Unknown Unit"}
                  </p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    {t.phone && <span>📞 {t.phone}</span>}
                    <span className="flex items-center gap-1"><Calendar size={10} /> Since {t.start_date}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveTenant(t.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                  title="Remove tenant record"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

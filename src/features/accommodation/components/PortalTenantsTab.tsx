import { useState, useEffect } from "react";
import { Users, UserPlus, Trash2, Calendar, Building2 } from "lucide-react";
import type { Tables } from "@/types/database/database.types";
import toast from "react-hot-toast";

type Accommodation = Tables<"accommodations">;

interface TenantRecord {
  accommodationId: string;
  name: string;
  phone?: string;
  startDate: string;
}

interface Props {
  listings: Accommodation[];
}

const STORAGE_KEY = "plawza_landlord_tenants";

export default function PortalTenantsTab({ listings }: Props) {
  const [tenants, setTenants] = useState<Record<string, TenantRecord>>({});
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTenants(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const saveTenants = (updated: Record<string, TenantRecord>) => {
    setTenants(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId || !tenantName.trim()) return;

    const updated = {
      ...tenants,
      [selectedUnitId]: {
        accommodationId: selectedUnitId,
        name: tenantName.trim(),
        phone: tenantPhone.trim(),
        startDate: startDate || new Date().toISOString().split("T")[0],
      },
    };
    saveTenants(updated);
    toast.success("Tenant record registered!");
    setSelectedUnitId("");
    setTenantName("");
    setTenantPhone("");
  };

  const handleRemoveTenant = (unitId: string) => {
    const updated = { ...tenants };
    delete updated[unitId];
    saveTenants(updated);
    toast.success("Tenant record removed.");
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Users size={16} className="text-primary" /> Tenant Registry
        </h3>
        <p className="text-xs text-slate-400">Keep track of active tenants across your rented units.</p>
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

        <button type="submit" className="btn-primary py-2 text-xs font-bold">
          Save Tenant Record
        </button>
      </form>

      {/* Active Tenants List */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Active Rented Units ({Object.keys(tenants).length})
        </h4>

        {Object.keys(tenants).length === 0 ? (
          <p className="text-xs text-slate-400 italic px-1 py-4 text-center">
            No tenants registered yet. Select a unit above to add records.
          </p>
        ) : (
          Object.values(tenants).map((t) => {
            const unit = listings.find((l) => l.id === t.accommodationId);
            return (
              <div key={t.accommodationId} className="card p-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{t.name}</p>
                  <p className="text-[11px] text-primary font-semibold truncate flex items-center gap-1">
                    <Building2 size={11} /> {unit?.title ?? "Unknown Unit"}
                  </p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    {t.phone && <span>📞 {t.phone}</span>}
                    <span className="flex items-center gap-1"><Calendar size={10} /> Since {t.startDate}</span>
                  </p>
                </div>

                <button
                  onClick={() => handleRemoveTenant(t.accommodationId)}
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

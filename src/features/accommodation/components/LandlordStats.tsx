import { Building2, Home, TrendingUp, Users } from "lucide-react";

interface Props {
  accommodations: Array<{
    id: string;
    title: string;
    monthly_rent: number;
    status: string;
    listing_type?: string;
  }>;
  totalConversations: number;
}

export default function LandlordStats({ accommodations, totalConversations }: Props) {
  const properties = accommodations.filter((a) => a.listing_type === "property" || !a.listing_type);
  const rentedIncome = properties
    .filter((a) => a.status === "rented")
    .reduce((sum, a) => sum + a.monthly_rent, 0);
  const avgRent = properties.length > 0
    ? Math.round(properties.reduce((s, a) => s + a.monthly_rent, 0) / properties.length)
    : 0;
  const occupancyRate = properties.length > 0
    ? Math.round((properties.filter((a) => a.status === "rented").length / properties.length) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="card p-3 flex items-center gap-3">
        <Home size={20} style={{ color: "var(--color-primary)" }} />
        <div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Properties</p>
          <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{properties.length}</p>
        </div>
      </div>
      <div className="card p-3 flex items-center gap-3">
        <TrendingUp size={20} style={{ color: "var(--color-success)" }} />
        <div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Rented income</p>
          <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>K{rentedIncome.toLocaleString()}</p>
        </div>
      </div>
      <div className="card p-3 flex items-center gap-3">
        <Building2 size={20} style={{ color: "var(--color-accent)" }} />
        <div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Avg rent</p>
          <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>K{avgRent.toLocaleString()}</p>
        </div>
      </div>
      <div className="card p-3 flex items-center gap-3">
        <Users size={20} style={{ color: "var(--color-primary)" }} />
        <div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Enquiries</p>
          <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{totalConversations}</p>
        </div>
      </div>
      <div className="col-span-2 card p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Occupancy</span>
          <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>{occupancyRate}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-200">
          <div className="h-full rounded-full" style={{ width: `${occupancyRate}%`, background: "var(--color-primary)" }} />
        </div>
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { useAuthStore } from "@/store/auth/authStore";
import type { Tables } from "@/types/database/database.types";
import { Loader2, Building2, Trash2 } from "lucide-react";

type Accommodation = Tables<"accommodations">;

export default function MyAccommodations() {
  const user = useAuthStore((s) => s.user);
  const [listings, setListings] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    accommodationService.getMyAccommodations(user.id).then((data) => {
      setListings(data);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} size={20} />
      </div>
    );
  }

  if (listings.length === 0) return null;

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    await accommodationService.deleteAccommodation(id);
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  const handleStatus = async (item: Accommodation) => {
    const newStatus = item.status === "available" ? "rented" : "available";
    await accommodationService.updateAccommodationStatus(item.id, newStatus);
    setListings((prev) =>
      prev.map((l) => (l.id === item.id ? { ...l, status: newStatus } : l))
    );
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
        <Building2 size={14} className="inline mr-1" />
        My Accommodations
      </h3>
      <div className="flex flex-col gap-2">
        {listings.map((item) => (
          <div key={item.id} className="card p-3 flex justify-between items-center">
            <Link
              to={`/accommodation/${item.id}`}
              className="flex-1"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {item.location} · K{item.monthly_rent}/mo · {item.status}
              </p>
            </Link>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={() => handleStatus(item)}
                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800"
              >
                {item.status === "available" ? "Mark rented" : "Mark available"}
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-xs px-2 py-1 rounded bg-red-100 text-red-800"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
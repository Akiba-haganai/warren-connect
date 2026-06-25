import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { useAuthStore } from "@/store/auth/authStore";
import type { Tables } from "@/types/database/database.types";

type Accommodation = Tables<"accommodations">;

export default function MyListings() {
  const user = useAuthStore((s) => s.user);
  const [listings, setListings] = useState<Accommodation[]>([]);

  useEffect(() => {
    if (!user) return;
    accommodationService
      .getMyAccommodations(user.id)
      .then(setListings)
      .catch(console.error);
  }, [user]);

  if (!listings.length) return null;

  return (
    <div className="mt-4 px-4">
      <h3
        className="text-sm font-semibold mb-2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        My Listings
      </h3>
      <div className="flex flex-col gap-2">
        {listings.map((item) => (
          <Link
            key={item.id}
            to={`/accommodation/${item.id}`}
            className="card p-3 flex justify-between items-center"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {item.location} · K{item.monthly_rent}/mo
              </p>
            </div>
            <span
              className={`badge ${
                item.status === "available" ? "badge-amber" : "badge-green"
              }`}
            >
              {item.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
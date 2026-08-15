import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  CheckCircle2,
  XCircle,
  Pencil,
  BedDouble,
  DoorClosed,
  Home,
} from "lucide-react";
import LandlordStats from "./LandlordStats";
import { accommodationService } from "@/services/accommodation/accommodationService";
import type { Tables } from "@/types/database/database.types";
import toast from "react-hot-toast";

type Accommodation = Tables<"accommodations">;

interface Props {
  listings: Accommodation[];
  onRefresh: () => void;
  onAddRoom: (parentId: string) => void;
  onEditListing: (listing: Accommodation) => void;
}

export default function PortalOverviewTab({
  listings,
  onRefresh,
  onAddRoom,
  onEditListing,
}: Props) {
  const [expandedProperties, setExpandedProperties] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processingBulk, setProcessingBulk] = useState(false);

  // Group listings into parent properties and standalone/nested rooms
  const parentProperties = listings.filter(
    (l) => l.listing_type === "property" || (!l.listing_type && !l.parent_id)
  );

  const roomsByParent = listings.reduce((acc, l) => {
    if (l.parent_id) {
      if (!acc[l.parent_id]) acc[l.parent_id] = [];
      acc[l.parent_id].push(l);
    }
    return acc;
  }, {} as Record<string, Accommodation[]>);

  const orphanUnits = listings.filter(
    (l) => (l.listing_type === "room" || l.listing_type === "bedspace") && !l.parent_id
  );

  const toggleExpand = (propertyId: string) => {
    setExpandedProperties((prev) => ({
      ...prev,
      [propertyId]: !prev[propertyId],
    }));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === listings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(listings.map((l) => l.id));
    }
  };

  const handleBulkStatus = async (status: "available" | "rented") => {
    if (!selectedIds.length) return;
    setProcessingBulk(true);
    try {
      await accommodationService.bulkUpdateStatus(selectedIds, status);
      toast.success(`Updated ${selectedIds.length} listing(s) to ${status}`);
      setSelectedIds([]);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update status.");
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete listing "${title}"?`)) return;
    try {
      await accommodationService.deleteAccommodation(id);
      toast.success("Listing deleted");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Could not delete");
    }
  };

  const handleToggleSingleStatus = async (listing: Accommodation) => {
    const newStatus = listing.status === "available" ? "rented" : "available";
    try {
      await accommodationService.updateAccommodationStatus(listing.id, newStatus);
      toast.success(`Marked as ${newStatus}`);
      onRefresh();
    } catch (e: any) {
      toast.error("Status update failed");
    }
  };

  return (
    <div className="space-y-4">
      <LandlordStats
        accommodations={listings.map((l) => ({
          id: l.id,
          title: l.title,
          monthly_rent: l.monthly_rent,
          status: l.status ?? "available",
          listing_type: l.listing_type ?? "property",
        }))}
        totalConversations={listings.length * 2}
      />

      {/* Bulk Action Toolbar */}
      {listings.length > 0 && (
        <div className="card p-3 flex flex-wrap items-center justify-between gap-2 bg-surface/50 border border-border/80">
          <button
            onClick={toggleSelectAll}
            className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
          >
            {selectedIds.length === listings.length ? (
              <CheckSquare size={16} className="text-primary" />
            ) : (
              <Square size={16} className="text-slate-400" />
            )}
            <span>
              {selectedIds.length > 0
                ? `Selected (${selectedIds.length}/${listings.length})`
                : "Select All"}
            </span>
          </button>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in duration-150">
              <button
                disabled={processingBulk}
                onClick={() => handleBulkStatus("rented")}
                className="text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 font-bold border border-blue-200 dark:border-blue-900 flex items-center gap-1"
              >
                <CheckCircle2 size={12} /> Mark Rented
              </button>
              <button
                disabled={processingBulk}
                onClick={() => handleBulkStatus("available")}
                className="text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-200 font-bold border border-green-200 dark:border-green-900 flex items-center gap-1"
              >
                <XCircle size={12} /> Mark Available
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hierarchical Property Tree */}
      <div className="space-y-3">
        {parentProperties.map((prop) => {
          const rooms = roomsByParent[prop.id] || [];
          const isExpanded = expandedProperties[prop.id] ?? true;
          const isSelected = selectedIds.includes(prop.id);

          return (
            <div
              key={prop.id}
              className="card overflow-hidden border border-border/80 shadow-xs"
            >
              {/* Parent Property Header */}
              <div className="p-3.5 bg-surface flex items-center justify-between gap-3 border-b border-border/40">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    onClick={() => toggleSelect(prop.id)}
                    className="text-slate-400 hover:text-primary transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="text-primary" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>

                  <button
                    onClick={() => toggleExpand(prop.id)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  <Home size={18} className="text-primary shrink-0" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/accommodation/${prop.id}`}
                        className="text-sm font-bold truncate text-slate-900 dark:text-white hover:text-primary transition-colors"
                      >
                        {prop.title}
                      </Link>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          prop.status === "available"
                            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {prop.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {prop.location} · K{prop.monthly_rent?.toLocaleString()}/mo
                      {rooms.length > 0 ? ` · ${rooms.length} unit(s)` : ""}
                    </p>
                  </div>
                </div>

                {/* Parent Property Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onAddRoom(prop.id)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors flex items-center gap-1"
                    title="Add Room to this property"
                  >
                    <Plus size={12} /> Add Room
                  </button>
                  <button
                    onClick={() => onEditListing(prop)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Edit listing"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(prop.id, prop.title)}
                    className="p-1.5 text-red-400 hover:text-red-600"
                    title="Delete listing"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Nested Rooms Sub-Tree */}
              {isExpanded && rooms.length > 0 && (
                <div className="bg-slate-50/50 dark:bg-slate-900/40 divide-y divide-border/30 border-t border-border/40">
                  {rooms.map((room) => {
                    const isRoomSelected = selectedIds.includes(room.id);
                    const UnitIcon = room.listing_type === "bedspace" ? BedDouble : DoorClosed;

                    return (
                      <div
                        key={room.id}
                        className="py-2.5 px-4 pl-10 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button
                            onClick={() => toggleSelect(room.id)}
                            className="text-slate-400 hover:text-primary transition-colors"
                          >
                            {isRoomSelected ? (
                              <CheckSquare size={14} className="text-primary" />
                            ) : (
                              <Square size={14} />
                            )}
                          </button>

                          <UnitIcon size={14} className="text-slate-400 shrink-0" />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/accommodation/${room.id}`}
                                className="font-semibold truncate text-slate-800 dark:text-slate-200 hover:text-primary"
                              >
                                {room.title}
                              </Link>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded capitalize ${
                                  room.status === "available"
                                    ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                }`}
                              >
                                {room.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              K{room.monthly_rent?.toLocaleString()}/mo
                              {room.capacity ? ` · Max ${room.capacity} tenant(s)` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleToggleSingleStatus(room)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded border border-border/80 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {room.status === "available" ? "Mark Rented" : "Mark Available"}
                          </button>
                          <button
                            onClick={() => onEditListing(room)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(room.id, room.title)}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Standalone Units (without parent) */}
        {orphanUnits.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Individual Rooms &amp; Bedspaces
            </p>
            {orphanUnits.map((unit) => (
              <div
                key={unit.id}
                className="card p-3 flex items-center justify-between gap-3 text-xs border border-border/80"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button onClick={() => toggleSelect(unit.id)}>
                    {selectedIds.includes(unit.id) ? (
                      <CheckSquare size={14} className="text-primary" />
                    ) : (
                      <Square size={14} className="text-slate-400" />
                    )}
                  </button>
                  <Building2 size={16} className="text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/accommodation/${unit.id}`}
                      className="font-bold truncate text-slate-900 dark:text-white hover:text-primary"
                    >
                      {unit.title}
                    </Link>
                    <p className="text-[10px] text-slate-400 truncate">
                      {unit.location} · K{unit.monthly_rent?.toLocaleString()}/mo · {unit.status}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleSingleStatus(unit)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded border border-border/80"
                  >
                    {unit.status === "available" ? "Mark Rented" : "Mark Available"}
                  </button>
                  <button onClick={() => onEditListing(unit)} className="p-1 text-slate-400">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(unit.id, unit.title)} className="p-1 text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {listings.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <Building2 size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">No property listings found</p>
            <p className="text-xs mt-1">Add your first campus property to start managing interest and tenants.</p>
          </div>
        )}
      </div>
    </div>
  );
}

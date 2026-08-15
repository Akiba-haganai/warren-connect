import { useState } from "react";
import { X, Building2, Users, UserCheck, Plus } from "lucide-react";
import PortalOverviewTab from "./PortalOverviewTab";
import PortalInterestTab from "./PortalInterestTab";
import PortalTenantsTab from "./PortalTenantsTab";
import type { Tables } from "@/types/database/database.types";

type Accommodation = Tables<"accommodations">;

interface Props {
  listings: Accommodation[];
  onClose: () => void;
  onRefresh: () => void;
  onAddProperty: () => void;
  onAddRoom: (parentId: string) => void;
  onEditListing: (listing: Accommodation) => void;
}

export default function LandlordPortal({
  listings,
  onClose,
  onRefresh,
  onAddProperty,
  onAddRoom,
  onEditListing,
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "inquiries" | "tenants">("overview");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs font-bold text-sm">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Landlord Management Hub
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Manage your properties, rooms, inquiries &amp; tenants
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddProperty}
              className="btn-primary text-xs font-semibold px-3 py-1.5 rounded-full shadow-xs flex items-center gap-1"
            >
              <Plus size={14} /> New Property
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center px-4 pt-2 border-b border-border bg-surface/50 gap-2 shrink-0">
          {[
            { id: "overview", label: "Properties & Units", icon: Building2 },
            { id: "inquiries", label: "Interest Queue", icon: Users },
            { id: "tenants", label: "Tenant Registry", icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {activeTab === "overview" && (
            <PortalOverviewTab
              listings={listings}
              onRefresh={onRefresh}
              onAddRoom={onAddRoom}
              onEditListing={onEditListing}
            />
          )}

          {activeTab === "inquiries" && <PortalInterestTab listings={listings} />}

          {activeTab === "tenants" && <PortalTenantsTab listings={listings} />}
        </div>
      </div>
    </div>
  );
}

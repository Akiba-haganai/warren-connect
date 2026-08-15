import { useEffect, useState } from "react";
import { Users, Loader2, Check, MessageSquare, Building2, AlertCircle } from "lucide-react";
import { listingInterestService } from "@/services/accommodation/listingInterestService";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/types/database/database.types";
import toast from "react-hot-toast";

type Accommodation = Tables<"accommodations">;

interface Props {
  listings: Accommodation[];
}

export default function PortalInterestTab({ listings }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [interestItems, setInterestItems] = useState<any[]>([]);

  const fetchAllInterest = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        listings.map(async (item) => {
          const queue = await listingInterestService.getQueueForListing(item.id);
          return queue.map((q) => ({ ...q, listingTitle: item.title, listingId: item.id }));
        })
      );
      setInterestItems(results.flat());
    } catch (e: any) {
      toast.error("Could not load interest queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listings.length > 0) fetchAllInterest();
    else setLoading(false);
  }, [listings]);

  const handleShortlist = async (id: string) => {
    try {
      await listingInterestService.shortlist(id);
      toast.success("Student shortlisted!");
      fetchAllInterest();
    } catch (e: any) {
      toast.error(e.message || "Failed to shortlist");
    }
  };

  const handleMessageUser = async (userId: string) => {
    navigate(`/messages?userId=${userId}`);
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center text-slate-400 gap-2 text-xs">
        <Loader2 size={16} className="animate-spin" /> Loading consolidated inquiries…
      </div>
    );
  }

  const activeQueue = interestItems.filter(
    (item) => item.status === "queued" || item.status === "shortlisted"
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Users size={16} className="text-primary" /> Consolidated Inquiries ({activeQueue.length})
          </h3>
          <p className="text-xs text-slate-400">All interested applicants across your properties.</p>
        </div>
      </div>

      {activeQueue.length === 0 ? (
        <div className="card py-12 px-4 text-center border border-dashed border-border/80">
          <AlertCircle size={28} className="mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No active queue entries</p>
          <p className="text-xs text-slate-400 mt-0.5">When students express interest in your rooms, they will appear here ranked in real-time.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeQueue.map((entry) => (
            <div
              key={entry.id}
              className="card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border/80 shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                {entry.profile?.avatar_url ? (
                  <img
                    src={entry.profile.avatar_url}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {entry.profile?.full_name?.[0] ?? "?"}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {entry.profile?.full_name ?? "Student"}
                    </p>
                    {entry.status === "shortlisted" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                        Shortlisted
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-primary font-semibold flex items-center gap-1 truncate">
                    <Building2 size={11} /> {entry.listingTitle}
                  </p>
                  {entry.note && (
                    <p className="text-[10px] text-slate-400 italic truncate mt-0.5">&ldquo;{entry.note}&rdquo;</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  onClick={() => handleMessageUser(entry.user_id)}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-200 flex items-center gap-1"
                >
                  <MessageSquare size={12} /> Message
                </button>

                {entry.status === "queued" && (
                  <button
                    onClick={() => handleShortlist(entry.id)}
                    className="text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-200 font-bold border border-green-200 dark:border-green-900 flex items-center gap-1"
                  >
                    <Check size={12} /> Shortlist
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

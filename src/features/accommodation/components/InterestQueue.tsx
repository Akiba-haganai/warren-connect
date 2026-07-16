import { useEffect, useState } from "react";
import { Users, Loader2, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { listingInterestService } from "@/services/accommodation/listingInterestService";
import { useAuthStore } from "@/store/auth/authStore";

interface Props {
  accommodationId: string;
  isOwner: boolean;
  isCollaborator: boolean;
  listingFull: boolean;
}

export default function InterestQueue({
  accommodationId,
  isOwner,
  isCollaborator,
  listingFull,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const canManage = isOwner || isCollaborator;

  const [loading, setLoading] = useState(true);
  const [myEntry, setMyEntry] = useState<any>(null);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [joining, setJoining] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (canManage) {
        setQueue(await listingInterestService.getQueueForListing(accommodationId));
      } else if (user) {
        const result = await listingInterestService.getMyPosition(accommodationId, user.id);
        setMyEntry(result?.entry ?? null);
        setMyPosition(result?.position ?? null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accommodationId, user?.id, canManage]);

  const handleJoin = async () => {
    if (!user) return;
    if (!profile?.is_verified) {
      toast.error("Verify your account to join a queue.");
      return;
    }

    setJoining(true);
    try {
      await listingInterestService.join(accommodationId, user.id);
      toast.success("You're in the queue!");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Could not join.");
    } finally {
      setJoining(false);
    }
  };

  const handleWithdraw = async () => {
    if (!myEntry) return;
    try {
      await listingInterestService.withdraw(myEntry.id);
      toast.success("Withdrawn from queue.");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Could not withdraw.");
    }
  };

  const handleShortlist = async (interestId: string) => {
    try {
      await listingInterestService.shortlist(interestId);
      toast.success("Shortlisted.");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Could not shortlist.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
        <Loader2 size={14} className="animate-spin" /> Loading queue…
      </div>
    );
  }

  // Landlord/collaborator view: ranked list
  if (canManage) {
    const active = queue.filter((q) => q.status === "queued" || q.status === "shortlisted");
    if (active.length === 0) {
      return (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          No one in the queue yet.
        </p>
      );
    }

    return (
      <div className="space-y-2">
        <h3
          className="text-sm font-semibold flex items-center gap-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <Users size={14} /> Interest queue ({active.length})
        </h3>

        {active.map((entry, i) => (
          <div key={entry.id} className="card p-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-xs font-bold w-5 text-center"
                style={{ color: "var(--color-text-muted)" }}
              >
                {i + 1}
              </span>

              {entry.profile?.avatar_url ? (
                <img
                  src={entry.profile.avatar_url}
                  className="w-7 h-7 rounded-full object-cover"
                  alt=""
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold"
                >
                  {entry.profile?.full_name?.[0] ?? "?"}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-medium truncate">
                  {entry.profile?.full_name ?? "Unknown"}
                </p>
                {entry.note && (
                  <p className="text-[10px] text-muted truncate">{entry.note}</p>
                )}
                {entry.status === "shortlisted" && (
                  <span className="text-[10px] text-green-700">Shortlisted</span>
                )}
              </div>
            </div>

            {entry.status === "queued" && (
              <button
                onClick={() => handleShortlist(entry.id)}
                className="text-[10px] px-2 py-1 rounded bg-green-100 text-green-800 flex items-center gap-1 flex-shrink-0"
              >
                <Check size={10} /> Shortlist
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Seeker view
  if (listingFull) {
    return (
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        This listing is no longer accepting interest.
      </p>
    );
  }

  if (myEntry && myEntry.status !== "withdrawn") {
    return (
      <div className="card p-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {myEntry.status === "shortlisted" ? "You've been shortlisted 🎉" : `You're #${myPosition} in the queue`}
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            We'll notify you if your status changes.
          </p>
        </div>

        {myEntry.status === "queued" && (
          <button
            onClick={handleWithdraw}
            className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 flex items-center gap-1"
          >
            <X size={12} /> Leave
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleJoin}
      disabled={joining}
      className="btn-primary w-auto px-4 py-2 text-sm flex items-center gap-2"
    >
      {joining ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
      Join the interest queue
    </button>
  );
}


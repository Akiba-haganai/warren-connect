import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notifications/notificationService";
import { useAuthStore } from "@/store/auth/authStore";
import { useNotificationSubscription } from "@/hooks/useNotificationSubscription";
import NotificationItem from "@/features/notifications/components/NotificationItem";
import { CheckCheck, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  useNotificationSubscription();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getNotifications(user!.id),
    enabled: !!user,
  });

  // Mark all – use React Query mutation (optimistic + refetch)
  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(user!.id),
    onMutate: () => {
      // Optimistically mark all as read in cache
      queryClient.setQueriesData({ queryKey: ["notifications"] }, (old: any) =>
        old?.map ? old.map((n: any) => ({ ...n, is_read: true })) : old
      );
    },
    onSettled: () => {
      // Refetch to ensure server state is reflected
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark one – directly call Supabase to avoid cache issues, then invalidate
  const handleMarkOne = async (id: string): Promise<void> => {
    // Direct DB update – bypasses cache until refetch
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", user!.id);   // ensure only own notification

    if (error) {
      console.error("Failed to mark as read:", error);
      throw error;
    }

    // Invalidate so the list refreshes next time
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  if (!user) return null;

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{
          background: "var(--color-surface)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
          Notifications
        </h1>
        {notifications && notifications.length > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="btn-ghost text-xs flex items-center gap-1"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div className="px-4 pt-2 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} />
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div
            className="rounded-2xl py-16 text-center"
            style={{
              background: "var(--color-surface)",
              border: "1px dashed var(--color-border)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No notifications yet
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={() => handleMarkOne(n.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
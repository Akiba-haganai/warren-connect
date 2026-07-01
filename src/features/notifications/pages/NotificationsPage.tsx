import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notifications/notificationService";
import { useAuthStore } from "@/store/auth/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationItem from "@/features/notifications/components/NotificationItem";
import GroupedNotificationItem from "@/features/notifications/components/GroupedNotificationItem";
import { CheckCheck, Loader2 } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { supabase } from "@/lib/supabase/client";

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useNotifications(user?.id);

  const { ref: loadMoreRef, inView } = useInView();
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const allNotifications = data?.pages.flatMap((p) => p.notifications) ?? [];

  const grouped = allNotifications.reduce((acc, n) => {
    const key = (n.link || "no-link") + "|" + n.type;
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)!.push(n);
    return acc;
  }, new Map<string, typeof allNotifications>());

  const groupedItems = Array.from(grouped.entries()).map(([key, notifs]) => ({
    key,
    notifications: notifs,
    count: notifs.length,
    latest: notifs[0],
  }));

  const markAllMutation = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const handleMarkOne = async (id: string) => {
    await notificationService.markAsRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user!.id] });
  };

  const handleDelete = async (id: string) => {
    await notificationService.deleteNotification(id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user!.id] });
  };

  if (!user) return null;

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--color-surface)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--color-border)" }}>
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Notifications</h1>
        {allNotifications.length > 0 && (
          <button onClick={markAllMutation} className="btn-ghost text-xs flex items-center gap-1">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="px-4 pt-2 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} /></div>
        ) : allNotifications.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No notifications yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {groupedItems.map(({ key, notifications, count }) =>
              count > 1 ? (
                <GroupedNotificationItem
                  key={key}
                  notifications={notifications}
                  onMarkRead={async () => {
                    await Promise.all(notifications.filter((n) => !n.is_read).map((n) => handleMarkOne(n.id)));
                  }}
                />
              ) : (
                <NotificationItem
                  key={notifications[0].id}
                  notification={notifications[0]}
                  onMarkRead={() => handleMarkOne(notifications[0].id)}
                  onDelete={() => handleDelete(notifications[0].id)}
                />
              )
            )}
            <div ref={loadMoreRef} className="h-4" />
            {isFetchingNextPage && <Loader2 className="animate-spin mx-auto" style={{ color: "var(--color-text-muted)" }} />}
          </div>
        )}
      </div>
    </div>
  );
}
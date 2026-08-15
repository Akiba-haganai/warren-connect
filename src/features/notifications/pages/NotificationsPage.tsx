import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notifications/notificationService";
import { useAuthStore } from "@/store/auth/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationItem from "@/features/notifications/components/NotificationItem";
import GroupedNotificationItem from "@/features/notifications/components/GroupedNotificationItem";
import { CheckCheck, Loader2, Trash2, Bell } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { supabase } from "@/lib/supabase/client";
import { useConfirm } from "@/hooks/useConfirm";

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

  const { confirm, ConfirmDialog } = useConfirm();

  const markAllMutation = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const handleClearAll = async () => {
    if (!user) return;
    const ok = await confirm({
      title: "Clear All Notifications",
      message: "Are you sure you want to delete all your notifications? This action cannot be undone.",
    });
    if (!ok) return;
    await notificationService.clearAllNotifications(user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const handleClearRead = async () => {
    if (!user) return;
    await notificationService.clearReadNotifications(user.id);
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
          <div className="flex items-center gap-2">
            <button onClick={markAllMutation} className="btn-ghost text-xs flex items-center gap-1">
              <CheckCheck size={14} /> Mark read
            </button>
            <button onClick={handleClearRead} className="btn-ghost text-xs text-slate-500 hover:text-slate-700">
              Clear Read
            </button>
            <button onClick={handleClearAll} className="btn-ghost text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
              <Trash2 size={13} /> Clear All
            </button>
          </div>
        )}
      </div>

      <div className="px-4 pt-2 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} /></div>
        ) : allNotifications.length === 0 ? (
          <div className="rounded-2xl py-14 px-4 text-center flex flex-col items-center justify-center gap-2" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
              <Bell size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No notifications yet</p>
            <p className="text-xs text-slate-400 max-w-xs">We&apos;ll notify you when someone messages you, interacts with your listings, or updates a post.</p>
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
      {ConfirmDialog}
    </div>
  );
}
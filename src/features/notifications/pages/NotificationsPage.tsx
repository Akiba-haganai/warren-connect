import { useEffect, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notifications/notificationService";
import { useAuthStore } from "@/store/auth/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationItem from "@/features/notifications/components/NotificationItem";
import GroupedNotificationItem from "@/features/notifications/components/GroupedNotificationItem";
import { CheckCheck, Loader2, Trash2, Bell, Sparkles, MessageCircle, ShoppingBag } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { supabase } from "@/lib/supabase/client";
import { useConfirm } from "@/hooks/useConfirm";
import toast from "react-hot-toast";

type FilterTab = "all" | "unread" | "messages" | "listings";

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

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

  const allNotifications = useMemo(() => data?.pages.flatMap((p) => p.notifications) ?? [], [data]);

  const unreadCount = useMemo(() => allNotifications.filter((n) => !n.is_read).length, [allNotifications]);
  const messageCount = useMemo(() => allNotifications.filter((n) => n.type === "message").length, [allNotifications]);
  const listingCount = useMemo(() => allNotifications.filter((n) => n.type === "product" || n.type === "accommodation").length, [allNotifications]);

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case "unread":
        return allNotifications.filter((n) => !n.is_read);
      case "messages":
        return allNotifications.filter((n) => n.type === "message");
      case "listings":
        return allNotifications.filter((n) => n.type === "product" || n.type === "accommodation");
      default:
        return allNotifications;
    }
  }, [allNotifications, activeTab]);

  const grouped = useMemo(() => {
    return filteredNotifications.reduce((acc, n) => {
      const key = (n.link || "no-link") + "|" + n.type;
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key)!.push(n);
      return acc;
    }, new Map<string, typeof allNotifications>());
  }, [filteredNotifications]);

  const groupedItems = useMemo(() => {
    return Array.from(grouped.entries()).map(([key, notifs]) => ({
      key,
      notifications: notifs,
      count: notifs.length,
      latest: notifs[0],
    }));
  }, [grouped]);

  const { confirm, ConfirmDialog } = useConfirm();

  const markAllMutation = async () => {
    if (!user) return;
    try {
      await notificationService.markAllAsRead(user.id);
      queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      toast.success("Marked all as read");
    } catch {
      toast.error("Failed to mark read");
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    const ok = await confirm({
      title: "Clear All Notifications",
      message: "Are you sure you want to delete all your notifications? This action cannot be undone.",
    });
    if (!ok) return;
    try {
      await notificationService.clearAllNotifications(user.id);
      queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      toast.success("Cleared all notifications");
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  const handleClearRead = async () => {
    if (!user) return;
    try {
      await notificationService.clearReadNotifications(user.id);
      queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      toast.success("Cleared read notifications");
    } catch {
      toast.error("Failed to clear read notifications");
    }
  };

  const handleMarkOne = async (id: string) => {
    await notificationService.markAsRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user!.id] });
  };

  const handleDelete = async (id: string) => {
    await notificationService.deleteNotification(id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user!.id] });
    toast.success("Notification deleted");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* 1-Line Sticky Glassmorphic Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Bell size={18} />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-950 dark:text-white leading-none">Notifications</h1>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount !== 1 ? "s" : ""}` : "All updates read"}
              </p>
            </div>
          </div>

          {allNotifications.length > 0 && (
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllMutation}
                  className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold flex items-center gap-1.5 hover:bg-primary-dark shadow-xs transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  <span>Mark read</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClearRead}
                className="px-2.5 py-1.5 rounded-full border border-border bg-surface text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Clear Read
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="p-1.5 rounded-full border border-red-200 dark:border-red-900/50 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {[
            { id: "all", label: "All", count: allNotifications.length, icon: Sparkles },
            { id: "unread", label: "Unread", count: unreadCount, icon: Bell },
            { id: "messages", label: "Chats", count: messageCount, icon: MessageCircle },
            { id: "listings", label: "Listings", count: listingCount, icon: ShoppingBag },
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface border border-border text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <IconComponent size={14} />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main List */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary mb-3" size={32} />
            <p className="text-sm font-medium text-slate-500">Loading notifications…</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-3xl p-12 text-center bg-surface border border-dashed border-border shadow-xs my-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Bell size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {allNotifications.length === 0 ? "No notifications yet" : "No updates match this filter"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {allNotifications.length === 0
                ? "We'll notify you when someone messages you, interacts with your listings, or updates a post."
                : "Try selecting a different filter tab above."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
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
            {isFetchingNextPage && <Loader2 className="animate-spin mx-auto text-primary py-4" />}
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}
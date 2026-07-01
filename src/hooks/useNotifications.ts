import { useInfiniteQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/notifications/notificationService";

const PAGE_SIZE = 20;

export function useNotifications(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["notifications", userId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return { notifications: [], nextPage: undefined };
      const offset = pageParam * PAGE_SIZE;
      const data = await notificationService.getNotificationsPaginated(userId, PAGE_SIZE, offset);
      return { notifications: data, nextPage: data.length === PAGE_SIZE ? pageParam + 1 : undefined };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!userId,
  });
}
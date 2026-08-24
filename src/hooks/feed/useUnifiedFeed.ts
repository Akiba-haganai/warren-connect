import { useInfiniteQuery } from "@tanstack/react-query";
import { unifiedFeedService, type FeedType } from "@/services/feed/unifiedFeedService";

export interface UseUnifiedFeedOptions {
  feedType?: FeedType;
  tag?: string;
  userId?: string;
  limit?: number;
}

export function useUnifiedFeed({
  feedType = "all",
  tag,
  userId,
  limit = 20,
}: UseUnifiedFeedOptions = {}) {
  return useInfiniteQuery({
    queryKey: ["unified-feed", { feedType, tag: tag || null, userId: userId || null }],
    queryFn: ({ pageParam }) =>
      unifiedFeedService.getUnifiedFeedCursor({
        limit,
        userId,
        feedType,
        tag,
        cursorCreatedAt: pageParam?.cursorCreatedAt ?? null,
        cursorId: pageParam?.cursorId ?? null,
      }),
    initialPageParam: null as { cursorCreatedAt: string; cursorId: string } | null,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });
}

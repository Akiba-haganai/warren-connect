import { useQuery } from "@tanstack/react-query";
import { messageService } from "@/services/messages/messageService";

export function useConversations(userId: string | undefined) {
  return useQuery({
    queryKey: ["conversations", userId],
    queryFn: () => messageService.getConversations(userId!),
    enabled: !!userId,
  });
}
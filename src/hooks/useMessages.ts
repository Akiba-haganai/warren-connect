import { useQuery } from "@tanstack/react-query";
import { messageService } from "@/services/messages/messageService";

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => messageService.getMessages(conversationId!),
    enabled: !!conversationId,
  });
}
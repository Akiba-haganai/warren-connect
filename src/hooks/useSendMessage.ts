import { useMutation, useQueryClient } from "@tanstack/react-query";
import { messageService, type Message } from "@/services/messages/messageService";

interface SendMessageInput {
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      messageService.sendMessage(
        input.conversationId,
        input.senderId,
        input.content,
        input.attachmentUrl,
        input.attachmentType
      ),

    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: ["messages", input.conversationId],
      });

      const previousMessages = queryClient.getQueryData<Message[]>([
        "messages",
        input.conversationId,
      ]);

      // Optimistic message
      const optimisticMsg: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: input.conversationId,
        sender_id: input.senderId,
        content: input.content,
        created_at: new Date().toISOString(),
        read_at: null,
        edited_at: null,
        deleted_at: null,
        attachment_url: input.attachmentUrl ?? null,
        attachment_type: input.attachmentType ?? null,
      };

      queryClient.setQueryData<Message[]>(
        ["messages", input.conversationId],
        (old) => [...(old || []), optimisticMsg]
      );

      return { previousMessages, tempId: optimisticMsg.id };
    },

    onSuccess: (serverMsg, input, context) => {
      // Replace temp message with server version
      queryClient.setQueryData<Message[]>(
        ["messages", input.conversationId],
        (old) =>
          old?.map((m) => (m.id === context?.tempId ? serverMsg : m)) ?? []
      );

      // Invalidate conversations to update last message
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },

    onError: (_err, input, context) => {
      // Remove failed message
      queryClient.setQueryData<Message[]>(
        ["messages", input.conversationId],
        (old) => old?.filter((m) => m.id !== context?.tempId) ?? []
      );
    },
  });
}
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { blockService } from '@/services/safety/blockService';

export function useBlockStatus(userId: string | undefined, targetId: string | undefined) {
  return useQuery({
    queryKey: ['blockStatus', userId, targetId],
    queryFn: () => blockService.isBlocked(userId!, targetId!),
    enabled: !!userId && !!targetId,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ blockerId, blockedId, action }: { blockerId: string; blockedId: string; action: 'block' | 'unblock' }) => {
      if (action === 'block') {
        await blockService.blockUser(blockerId, blockedId);
      } else {
        await blockService.unblockUser(blockerId, blockedId);
      }
      return { blockerId, blockedId, action };
    },
    onSuccess: (data) => {
      // Invalidate block status for this specific pair
      queryClient.invalidateQueries({ queryKey: ['blockStatus', data.blockerId, data.blockedId] });
      
      // Invalidate all content feeds where this user might appear
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

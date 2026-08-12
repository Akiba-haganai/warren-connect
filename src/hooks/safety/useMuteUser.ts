import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { blockService } from '@/services/safety/blockService';

export function useMutedUsers(userId: string | undefined) {
  return useQuery({
    queryKey: ['mutedUsers', userId],
    queryFn: () => blockService.getMutedUsers(userId!),
    enabled: !!userId,
  });
}

export function useMuteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ muterId, mutedId, action }: { muterId: string; mutedId: string; action: 'mute' | 'unmute' }) => {
      if (action === 'mute') {
        await blockService.muteUser(muterId, mutedId);
      } else {
        await blockService.unmuteUser(muterId, mutedId);
      }
      return { muterId, mutedId, action };
    },
    onSuccess: (data) => {
      // Invalidate muted users list
      queryClient.invalidateQueries({ queryKey: ['mutedUsers', data.muterId] });
      
      // We don't necessarily need to invalidate 'posts' here if the feed 
      // uses the mutedUsers query to post-filter. But invalidating is safer if we want immediate UI updates.
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { challengeService } from '@/services/challengeService';
import { challengeQueryKey } from './useChallenge';
import { PROFILE_QUERY_KEY } from '@/features/profile/hooks/useProfile';

export function useUnlockHint(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ challengeId, hintId }: { challengeId: string; hintId: string }) =>
      challengeService.unlockHint(challengeId, hintId),
    onSuccess: () => {
      // Points spent; and the challenge detail's hint list should reflect
      // the newly-unlocked content on next read.
      queryClient.invalidateQueries({ queryKey: challengeQueryKey(slug) });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

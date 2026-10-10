import { useMutation, useQueryClient } from '@tanstack/react-query';
import { challengeService } from '@/services/challengeService';
import { challengeQueryKey } from './useChallenge';
import { CHALLENGES_QUERY_KEY } from './useChallenges';
import { PROFILE_QUERY_KEY } from '@/features/profile/hooks/useProfile';

export function useSubmitFlag(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ challengeId, flag }: { challengeId: string; flag: string }) =>
      challengeService.submitFlag(challengeId, flag),
    onSuccess: (result) => {
      if (result.correct) {
        // Points, solved status, and rank all potentially changed.
        queryClient.invalidateQueries({ queryKey: challengeQueryKey(slug) });
        queryClient.invalidateQueries({ queryKey: CHALLENGES_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      }
    },
  });
}

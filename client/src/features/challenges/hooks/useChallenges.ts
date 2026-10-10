import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { challengeService, type ChallengeListParams } from '@/services/challengeService';

export const CHALLENGES_QUERY_KEY = ['challenges'] as const;

export function useChallenges(params: ChallengeListParams = {}) {
  return useQuery({
    queryKey: [...CHALLENGES_QUERY_KEY, params],
    queryFn: () => challengeService.list(params),
    placeholderData: keepPreviousData,
  });
}

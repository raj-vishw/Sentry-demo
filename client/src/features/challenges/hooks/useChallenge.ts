import { useQuery } from '@tanstack/react-query';
import { challengeService } from '@/services/challengeService';

export function challengeQueryKey(slug: string) {
  return ['challenge', slug] as const;
}

export function useChallenge(slug: string | undefined) {
  return useQuery({
    queryKey: challengeQueryKey(slug ?? ''),
    queryFn: () => challengeService.getBySlug(slug!),
    enabled: !!slug,
  });
}

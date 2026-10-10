import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';

export const PROFILE_QUERY_KEY = ['profile'] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: userService.getProfile,
  });
}

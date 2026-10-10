import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';

export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => userService.getPublicProfile(username),
  });
}

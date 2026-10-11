import { useQuery } from '@tanstack/react-query';
import { leaderboardService, type LeaderboardScope } from '@/services/leaderboardService';

export function useLeaderboard(scope: LeaderboardScope, page: number, limit: number) {
  return useQuery({
    queryKey: ['leaderboard', scope, page],
    queryFn: () => leaderboardService.getLeaderboard(scope, page, limit),
  });
}

export function useTeamLeaderboard(page: number, limit: number) {
  return useQuery({
    queryKey: ['leaderboard', 'teams', page],
    queryFn: () => leaderboardService.getTeamLeaderboard(page, limit),
  });
}

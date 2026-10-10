import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamService } from '@/services/teamService';
import { PROFILE_QUERY_KEY } from '@/features/profile/hooks/useProfile';

export const MY_TEAM_QUERY_KEY = ['team', 'mine'] as const;
export const TEAMS_LIST_QUERY_KEY = ['teams', 'list'] as const;

export function useMyTeam() {
  return useQuery({ queryKey: MY_TEAM_QUERY_KEY, queryFn: teamService.getMine });
}

export function useTeamsList(page: number) {
  return useQuery({
    queryKey: [...TEAMS_LIST_QUERY_KEY, page],
    queryFn: () => teamService.list(page, 12),
  });
}

/** Any mutation that changes team membership/shape invalidates both the
 * team itself and the profile (which surfaces `teamName` in the nav/OS chrome). */
function useTeamMutation<TResult, TVariables>(mutationFn: (vars: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_TEAM_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TEAMS_LIST_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

export function useCreateTeam() {
  return useTeamMutation((input: { name: string; description?: string }) => teamService.create(input));
}

export function useJoinTeam() {
  return useTeamMutation((inviteCode: string) => teamService.join(inviteCode));
}

export function useLeaveTeam() {
  return useTeamMutation(() => teamService.leave());
}

export function useUpdateTeam() {
  return useTeamMutation((input: { description?: string }) => teamService.update(input));
}

export function useRemoveMember() {
  return useTeamMutation((userId: string) => teamService.removeMember(userId));
}

export function useTransferOwnership() {
  return useTeamMutation((userId: string) => teamService.transferOwnership(userId));
}

export function useRegenerateInviteCode() {
  return useTeamMutation(() => teamService.regenerateInviteCode());
}

export function useDisbandTeam() {
  return useTeamMutation(() => teamService.disband());
}

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { writeupService, type ListWriteupsParams } from '@/services/writeupService';
import { reportService } from '@/services/reportService';

export const WRITEUPS_QUERY_KEY = ['writeups'] as const;

export function useWriteupsList(params: ListWriteupsParams = {}) {
  return useQuery({
    queryKey: [...WRITEUPS_QUERY_KEY, params],
    queryFn: () => writeupService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useMyWriteups() {
  return useQuery({ queryKey: [...WRITEUPS_QUERY_KEY, 'mine'], queryFn: writeupService.listMine });
}

export function writeupQueryKey(slug: string) {
  return [...WRITEUPS_QUERY_KEY, slug] as const;
}

export function useWriteup(slug: string | undefined) {
  return useQuery({
    queryKey: writeupQueryKey(slug ?? ''),
    queryFn: () => writeupService.getBySlug(slug!),
    enabled: !!slug,
  });
}

function useWriteupMutation<TResult, TVariables>(mutationFn: (vars: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WRITEUPS_QUERY_KEY }),
  });
}

export function useCreateWriteup() {
  return useWriteupMutation((input: { title: string; challengeId: string; content: string }) =>
    writeupService.create(input),
  );
}

export function useUpdateWriteup() {
  return useWriteupMutation(({ id, input }: { id: string; input: { title?: string; content?: string } }) =>
    writeupService.update(id, input),
  );
}

export function useSubmitWriteupForReview() {
  return useWriteupMutation((id: string) => writeupService.submitForReview(id));
}

export function useDeleteWriteup() {
  return useWriteupMutation((id: string) => writeupService.remove(id));
}

export function useToggleWriteupLike() {
  return useWriteupMutation(({ id }: { id: string }) => writeupService.toggleLike(id));
}

export function useReportWriteup() {
  return useMutation({
    mutationFn: ({ writeupId, reason }: { writeupId: string; reason: string }) =>
      reportService.create({ targetType: 'writeup', targetId: writeupId, reason }),
  });
}

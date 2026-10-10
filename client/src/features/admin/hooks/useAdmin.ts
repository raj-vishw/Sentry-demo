import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService, type ListAdminUsersParams, type ListAdminSubmissionsParams, type ListAuditLogsParams } from '@/services/adminService';
import { writeupService, type ListWriteupsParams } from '@/services/writeupService';
import { reportService } from '@/services/reportService';
import type { CompetitionConfig, ReportStatus, StatsRange, SystemConfig } from '@/types';

// --- Users ---

export function useAdminUsers(params: ListAdminUsersParams) {
  return useQuery({ queryKey: ['admin-users', params], queryFn: () => adminService.getUsers(params) });
}

export function useAdminUserDetail(id: string | null) {
  return useQuery({
    queryKey: ['admin-user-detail', id],
    queryFn: () => adminService.getUserDetail(id!),
    enabled: !!id,
  });
}

export function useSetUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'DISABLED' | 'BANNED' }) =>
      status === 'DISABLED'
        ? adminService.disableUser(id)
        : status === 'BANNED'
          ? adminService.banUser(id)
          : adminService.enableUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] });
    },
  });
}

export function useApproveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.approveUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] });
    },
  });
}

export function useRejectUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.rejectUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useSetUserHidden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      hidden ? adminService.hideUser(id) : adminService.unhideUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] });
    },
  });
}

export function useSetTeamHidden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      hidden ? adminService.hideTeam(id) : adminService.unhideTeam(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-teams'] }),
  });
}

// --- Submissions ---

export function useAdminSubmissions(params: ListAdminSubmissionsParams) {
  return useQuery({ queryKey: ['admin-submissions', params], queryFn: () => adminService.getSubmissions(params) });
}

export function useInvalidateSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.invalidateSubmission(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-submissions'] }),
  });
}

// --- Categories ---

export function useAdminCategories() {
  return useQuery({ queryKey: ['admin-categories'], queryFn: adminService.getCategories });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, input }: { slug: string; input: Parameters<typeof adminService.updateCategory>[1] }) =>
      adminService.updateCategory(slug, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
  });
}

// --- Pages ---

const ADMIN_PAGES_KEY = ['admin-pages'];

export function useAdminPages() {
  return useQuery({ queryKey: ADMIN_PAGES_KEY, queryFn: adminService.getPages });
}

function invalidatePages(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ADMIN_PAGES_KEY });
  queryClient.invalidateQueries({ queryKey: ['pages'] });
}

export function useCreatePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof adminService.createPage>[0]) => adminService.createPage(input),
    onSuccess: () => invalidatePages(queryClient),
  });
}

export function useUpdatePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof adminService.updatePage>[1] }) =>
      adminService.updatePage(id, input),
    onSuccess: () => invalidatePages(queryClient),
  });
}

export function useDeletePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deletePage(id),
    onSuccess: () => invalidatePages(queryClient),
  });
}

// --- Announcements ---

export function useAdminAnnouncements(page: number, limit = 20) {
  return useQuery({
    queryKey: ['admin-announcements', page, limit],
    queryFn: () => adminService.getAnnouncements(page, limit),
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => adminService.createAnnouncement(message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteAnnouncement(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
  });
}

// --- Statistics ---

export function useOverviewStats() {
  return useQuery({ queryKey: ['admin-stats-overview'], queryFn: adminService.getOverview });
}

export function useUserStats(range: StatsRange) {
  return useQuery({ queryKey: ['admin-stats-users', range], queryFn: () => adminService.getUserStats(range) });
}

export function useChallengeStats(range: StatsRange) {
  return useQuery({ queryKey: ['admin-stats-challenges', range], queryFn: () => adminService.getChallengeStats(range) });
}

export function useSubmissionStats(range: StatsRange) {
  return useQuery({ queryKey: ['admin-stats-submissions', range], queryFn: () => adminService.getSubmissionStats(range) });
}

export function useTeamStats(range: StatsRange) {
  return useQuery({ queryKey: ['admin-stats-teams', range], queryFn: () => adminService.getTeamStats(range) });
}

export function useWriteupStats(range: StatsRange) {
  return useQuery({ queryKey: ['admin-stats-writeups', range], queryFn: () => adminService.getWriteupStats(range) });
}

// --- Audit log ---

export function useAuditLogs(params: ListAuditLogsParams) {
  return useQuery({ queryKey: ['admin-audit-logs', params], queryFn: () => adminService.getAuditLogs(params) });
}

// --- Writeups moderation ---

export function useAdminWriteups(params: ListWriteupsParams & { status?: string }) {
  return useQuery({ queryKey: ['admin-writeups', params], queryFn: () => writeupService.listForAdmin(params) });
}

function useWriteupModerationMutation<TResult, TVariables>(mutationFn: (vars: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-writeups'] });
      queryClient.invalidateQueries({ queryKey: ['writeups'] });
    },
  });
}

export function useApproveWriteup() {
  return useWriteupModerationMutation((id: string) => writeupService.approve(id));
}

export function useRejectWriteup() {
  return useWriteupModerationMutation(({ id, reason }: { id: string; reason: string }) => writeupService.reject(id, reason));
}

export function useArchiveWriteup() {
  return useWriteupModerationMutation((id: string) => writeupService.archive(id));
}

// --- Reports ---

export function useAdminReports(status?: ReportStatus) {
  return useQuery({ queryKey: ['admin-reports', status], queryFn: () => reportService.list({ status, limit: 50 }) });
}

function useReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'resolve' | 'dismiss' }) =>
      action === 'resolve' ? reportService.resolve(id) : reportService.dismiss(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
  });
}

export function useReviewReport() {
  return useReportMutation();
}

// --- Platform settings ---

export function useAdminSettings() {
  return useQuery({ queryKey: ['admin-settings'], queryFn: adminService.getSettings });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Omit<SystemConfig, 'setupCompleted'>>) => adminService.updateSettings(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-settings'] }),
  });
}

// --- Competition settings ---

export function useCompetitionSettings() {
  return useQuery({ queryKey: ['admin-competition'], queryFn: adminService.getCompetitionSettings });
}

export function useUpdateCompetitionSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CompetitionConfig>) => adminService.updateCompetitionSettings(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-competition'] }),
  });
}

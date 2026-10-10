import type {
  AdminAnnouncement,
  AdminCategory,
  AdminPage,
  AdminUserDetail,
  AdminUserListItem,
  AdminSubmission,
  AuditLogEntry,
  Category,
  ChallengeEnvironment,
  ChallengeStats,
  ChallengeStatus,
  ChallengeType,
  Challenge,
  CompetitionConfig,
  Difficulty,
  Pagination,
  PlatformOverview,
  StatsRange,
  SubmissionStats,
  SystemConfig,
  TeamStats,
  TeamSummary,
  UserStats,
  WriteupStats,
} from '@/types';
import { apiClient, ADMIN_PREFIX } from '@/lib/apiClient';
import { challengeService, DIFFICULTY_TO_FRONTEND, DIFFICULTY_TO_BACKEND } from './challengeService';
import { teamService } from './teamService';

export interface AdminHintInput {
  id?: string;
  title: string;
  content: string;
  cost: number;
  order: number;
  active: boolean;
}

export interface AdminEnvironmentInput {
  port: number | null;
  protocol: 'HTTP' | 'TCP' | 'UDP';
  cpuLimit: number;
  memoryLimitMb: number;
  timeoutSeconds: number;
}

export interface AdminChallengeInput {
  title: string;
  description: string;
  shortDescription: string;
  tags: string[];
  category: Category;
  type: ChallengeType;
  difficulty: Difficulty;
  points: number;
  /** Omit (or leave blank) on update to leave the existing flag untouched. */
  flag?: string;
  flagFormat: string;
  published: boolean;
  hints: AdminHintInput[];
  /** Id of a published challenge that must be solved first, or null for none. */
  prerequisite?: string | null;
  /** Required for INTERACTIVE/HYBRID, null for STATIC. */
  environment: AdminEnvironmentInput | null;
}

/** The admin edit form's view of a challenge — full hint content, no flag. */
export interface AdminChallengeDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  tags: string[];
  category: Category;
  type: ChallengeType;
  difficulty: Difficulty;
  points: number;
  flagFormat: string;
  published: boolean;
  status: ChallengeStatus;
  hints: AdminHintInput[];
  prerequisite: string | null;
  prerequisiteTitle: string | null;
  environment: ChallengeEnvironment | null;
  originalAuthor: string | null;
}

interface BackendAdminHint {
  id: string;
  title: string;
  content: string;
  cost: number;
  order: number;
  active: boolean;
}

interface BackendAdminChallengeDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  tags: string[];
  category: Category;
  type: ChallengeType;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'INSANE';
  points: number;
  flagFormat: string;
  published: boolean;
  status: ChallengeStatus;
  hints: BackendAdminHint[];
  prerequisiteId: string | null;
  prerequisiteTitle: string | null;
  environment: ChallengeEnvironment | null;
  originalAuthor: string | null;
}

function toAdminDetail(raw: BackendAdminChallengeDetail): AdminChallengeDetail {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    shortDescription: raw.shortDescription,
    tags: raw.tags,
    category: raw.category,
    type: raw.type,
    difficulty: DIFFICULTY_TO_FRONTEND[raw.difficulty],
    points: raw.points,
    flagFormat: raw.flagFormat,
    published: raw.published,
    status: raw.status,
    hints: raw.hints.map((h) => ({
      id: h.id,
      title: h.title,
      content: h.content,
      cost: h.cost,
      order: h.order,
      active: h.active,
    })),
    prerequisite: raw.prerequisiteId,
    prerequisiteTitle: raw.prerequisiteTitle,
    environment: raw.environment,
    originalAuthor: raw.originalAuthor,
  };
}

function toBackendPayload(input: AdminChallengeInput) {
  return {
    title: input.title,
    description: input.description,
    shortDescription: input.shortDescription,
    tags: input.tags,
    category: input.category,
    type: input.type,
    difficulty: DIFFICULTY_TO_BACKEND[input.difficulty],
    points: input.points,
    ...(input.flag ? { flag: input.flag } : {}),
    flagFormat: input.flagFormat,
    published: input.published,
    hints: input.hints.map(({ title, content, cost, order, active }) => ({ title, content, cost, order, active })),
    prerequisite: input.prerequisite ?? null,
    environment: input.environment,
  };
}

function buildQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

/**
 * CSV/zip export requires the Bearer token, which a plain `<a href>` can't
 * send — same authenticated-blob-then-object-URL pattern already used for
 * challenge file downloads (see challengeService.ts#downloadFile).
 */
async function downloadBlob(path: string, filename: string): Promise<void> {
  const blob = await apiClient.getBlob(path);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export interface ListAdminUsersParams {
  search?: string;
  role?: 'user' | 'admin';
  status?: 'ACTIVE' | 'DISABLED' | 'BANNED' | 'PENDING';
  sort?: 'newest' | 'oldest' | 'points-desc' | 'points-asc';
  page?: number;
  limit?: number;
}

export interface ListAdminSubmissionsParams {
  username?: string;
  challengeId?: string;
  category?: Category;
  result?: 'correct' | 'incorrect';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ListAuditLogsParams {
  actor?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const adminService = {
  async getTeams() {
    const { teams } = await teamService.list(1, 100);
    return teams;
  },

  // --- Challenge management: real backend ---

  /** Admins see unpublished challenges too via the same public list endpoint. */
  async getChallenges(): Promise<Challenge[]> {
    const { challenges } = await challengeService.list({ limit: 100 });
    return challenges;
  },

  async getChallengeById(id: string): Promise<AdminChallengeDetail> {
    const { challenge } = await apiClient.get<{ challenge: BackendAdminChallengeDetail }>(`/${ADMIN_PREFIX}/challenges/${id}`);
    return toAdminDetail(challenge);
  },

  async createChallenge(input: AdminChallengeInput): Promise<AdminChallengeDetail> {
    const { challenge } = await apiClient.post<{ challenge: BackendAdminChallengeDetail }>(
      `/${ADMIN_PREFIX}/challenges`,
      toBackendPayload(input),
    );
    return toAdminDetail(challenge);
  },

  async updateChallenge(id: string, input: AdminChallengeInput): Promise<AdminChallengeDetail> {
    const { challenge } = await apiClient.patch<{ challenge: BackendAdminChallengeDetail }>(
      `/${ADMIN_PREFIX}/challenges/${id}`,
      toBackendPayload(input),
    );
    return toAdminDetail(challenge);
  },

  async deleteChallenge(id: string): Promise<void> {
    await apiClient.delete(`/${ADMIN_PREFIX}/challenges/${id}`);
  },

  async setPublished(id: string, published: boolean): Promise<void> {
    await apiClient.post(`/${ADMIN_PREFIX}/challenges/${id}/${published ? 'publish' : 'unpublish'}`);
  },

  async archiveChallenge(id: string): Promise<AdminChallengeDetail> {
    const { challenge } = await apiClient.post<{ challenge: BackendAdminChallengeDetail }>(
      `/${ADMIN_PREFIX}/challenges/${id}/archive`,
    );
    return toAdminDetail(challenge);
  },

  async restoreChallenge(id: string): Promise<AdminChallengeDetail> {
    const { challenge } = await apiClient.post<{ challenge: BackendAdminChallengeDetail }>(
      `/${ADMIN_PREFIX}/challenges/${id}/restore`,
    );
    return toAdminDetail(challenge);
  },

  async uploadChallengeFile(id: string, file: File): Promise<void> {
    const form = new FormData();
    form.append('file', file);
    await apiClient.postForm(`/${ADMIN_PREFIX}/challenges/${id}/files`, form);
  },

  /**
   * Import creates a DRAFT, never auto-published — the admin always
   * reviews it (edit/preview/publish) before players can see it.
   */
  async importChallenge(archive: File, flag: string): Promise<AdminChallengeDetail> {
    const form = new FormData();
    form.append('archive', archive);
    form.append('flag', flag);
    const { challenge } = await apiClient.postForm<{ challenge: BackendAdminChallengeDetail }>(
      `/${ADMIN_PREFIX}/challenges/import`,
      form,
    );
    return toAdminDetail(challenge);
  },

  /** Never contains a flag value — flags are hash-only, never recoverable (see server/README.md). */
  async exportChallenge(id: string, filename: string): Promise<void> {
    await downloadBlob(`/${ADMIN_PREFIX}/challenges/${id}/export`, filename);
  },

  // --- Users ---

  async getUsers(params: ListAdminUsersParams = {}): Promise<{ users: AdminUserListItem[]; pagination: Pagination }> {
    return apiClient.get(`/${ADMIN_PREFIX}/users${buildQuery(params)}`);
  },

  async getUserDetail(id: string): Promise<AdminUserDetail> {
    const { user } = await apiClient.get<{ user: AdminUserDetail }>(`/${ADMIN_PREFIX}/users/${id}`);
    return user;
  },

  async disableUser(id: string): Promise<AdminUserListItem> {
    const { user } = await apiClient.post<{ user: AdminUserListItem }>(`/${ADMIN_PREFIX}/users/${id}/disable`);
    return user;
  },

  async enableUser(id: string): Promise<AdminUserListItem> {
    const { user } = await apiClient.post<{ user: AdminUserListItem }>(`/${ADMIN_PREFIX}/users/${id}/enable`);
    return user;
  },

  async banUser(id: string): Promise<AdminUserListItem> {
    const { user } = await apiClient.post<{ user: AdminUserListItem }>(`/${ADMIN_PREFIX}/users/${id}/ban`);
    return user;
  },

  async approveUser(id: string): Promise<AdminUserListItem> {
    const { user } = await apiClient.post<{ user: AdminUserListItem }>(`/${ADMIN_PREFIX}/users/${id}/approve`);
    return user;
  },

  async rejectUser(id: string): Promise<void> {
    await apiClient.post(`/${ADMIN_PREFIX}/users/${id}/reject`);
  },

  async hideUser(id: string): Promise<AdminUserListItem> {
    const { user } = await apiClient.post<{ user: AdminUserListItem }>(`/${ADMIN_PREFIX}/users/${id}/hide`);
    return user;
  },

  async unhideUser(id: string): Promise<AdminUserListItem> {
    const { user } = await apiClient.post<{ user: AdminUserListItem }>(`/${ADMIN_PREFIX}/users/${id}/unhide`);
    return user;
  },

  async hideTeam(id: string): Promise<TeamSummary> {
    const { team } = await apiClient.post<{ team: TeamSummary }>(`/${ADMIN_PREFIX}/teams/${id}/hide`);
    return team;
  },

  async unhideTeam(id: string): Promise<TeamSummary> {
    const { team } = await apiClient.post<{ team: TeamSummary }>(`/${ADMIN_PREFIX}/teams/${id}/unhide`);
    return team;
  },

  async exportUsersCsv(params: Pick<ListAdminUsersParams, 'search' | 'role' | 'status'> = {}): Promise<void> {
    await downloadBlob(`/${ADMIN_PREFIX}/users/export.csv${buildQuery(params)}`, 'users.csv');
  },

  // --- Submissions ---

  async getSubmissions(
    params: ListAdminSubmissionsParams = {},
  ): Promise<{ submissions: AdminSubmission[]; pagination: Pagination }> {
    return apiClient.get(`/${ADMIN_PREFIX}/submissions${buildQuery(params)}`);
  },

  async invalidateSubmission(id: string): Promise<void> {
    await apiClient.post(`/${ADMIN_PREFIX}/submissions/${id}/invalidate`);
  },

  async exportSubmissionsCsv(params: ListAdminSubmissionsParams = {}): Promise<void> {
    await downloadBlob(`/${ADMIN_PREFIX}/submissions/export.csv${buildQuery(params)}`, 'submissions.csv');
  },

  // --- Categories ---

  async getCategories(): Promise<AdminCategory[]> {
    const { categories } = await apiClient.get<{ categories: AdminCategory[] }>(`/${ADMIN_PREFIX}/categories`);
    return categories;
  },

  async updateCategory(
    slug: string,
    input: Partial<Pick<AdminCategory, 'name' | 'description' | 'icon' | 'active'>>,
  ): Promise<AdminCategory> {
    const { category } = await apiClient.patch<{ category: AdminCategory }>(`/${ADMIN_PREFIX}/categories/${slug}`, input);
    return category;
  },

  // --- Pages ---

  async getPages(): Promise<AdminPage[]> {
    const { pages } = await apiClient.get<{ pages: AdminPage[] }>(`/${ADMIN_PREFIX}/pages`);
    return pages;
  },

  async createPage(input: { slug: string; title: string; content: string }): Promise<AdminPage> {
    const { page } = await apiClient.post<{ page: AdminPage }>(`/${ADMIN_PREFIX}/pages`, input);
    return page;
  },

  async updatePage(id: string, input: Partial<{ slug: string; title: string; content: string }>): Promise<AdminPage> {
    const { page } = await apiClient.patch<{ page: AdminPage }>(`/${ADMIN_PREFIX}/pages/${id}`, input);
    return page;
  },

  async deletePage(id: string): Promise<void> {
    await apiClient.delete(`/${ADMIN_PREFIX}/pages/${id}`);
  },

  // --- Announcements ---

  async getAnnouncements(page = 1, limit = 20): Promise<{ entries: AdminAnnouncement[]; pagination: Pagination }> {
    return apiClient.get(`/${ADMIN_PREFIX}/announcements?page=${page}&limit=${limit}`);
  },

  async createAnnouncement(message: string): Promise<AdminAnnouncement> {
    const { announcement } = await apiClient.post<{ announcement: AdminAnnouncement }>(
      `/${ADMIN_PREFIX}/announcements`,
      { message },
    );
    return announcement;
  },

  async deleteAnnouncement(id: string): Promise<void> {
    await apiClient.delete(`/${ADMIN_PREFIX}/announcements/${id}`);
  },

  // --- Statistics ---

  async getOverview(): Promise<PlatformOverview> {
    return apiClient.get(`/${ADMIN_PREFIX}/statistics/overview`);
  },

  async getUserStats(range: StatsRange): Promise<UserStats> {
    return apiClient.get(`/${ADMIN_PREFIX}/statistics/users?range=${range}`);
  },

  async getChallengeStats(range: StatsRange): Promise<ChallengeStats> {
    return apiClient.get(`/${ADMIN_PREFIX}/statistics/challenges?range=${range}`);
  },

  async getSubmissionStats(range: StatsRange): Promise<SubmissionStats> {
    return apiClient.get(`/${ADMIN_PREFIX}/statistics/submissions?range=${range}`);
  },

  async getTeamStats(range: StatsRange): Promise<TeamStats> {
    return apiClient.get(`/${ADMIN_PREFIX}/statistics/teams?range=${range}`);
  },

  async getWriteupStats(range: StatsRange): Promise<WriteupStats> {
    return apiClient.get(`/${ADMIN_PREFIX}/statistics/writeups?range=${range}`);
  },

  // --- Audit log ---

  async getAuditLogs(params: ListAuditLogsParams = {}): Promise<{ entries: AuditLogEntry[]; pagination: Pagination }> {
    return apiClient.get(`/${ADMIN_PREFIX}/audit-logs${buildQuery(params)}`);
  },

  // --- Platform settings ---

  async getSettings(): Promise<SystemConfig> {
    const { config } = await apiClient.get<{ config: SystemConfig }>(`/${ADMIN_PREFIX}/settings`);
    return config;
  },

  async updateSettings(input: Partial<Omit<SystemConfig, 'setupCompleted'>>): Promise<SystemConfig> {
    const { config } = await apiClient.patch<{ config: SystemConfig }>(`/${ADMIN_PREFIX}/settings`, input);
    return config;
  },

  // --- Competition settings ---

  async getCompetitionSettings(): Promise<CompetitionConfig> {
    const { config } = await apiClient.get<{ config: CompetitionConfig }>(`/${ADMIN_PREFIX}/competition`);
    return config;
  },

  async updateCompetitionSettings(input: Partial<CompetitionConfig>): Promise<CompetitionConfig> {
    const { config } = await apiClient.patch<{ config: CompetitionConfig }>(`/${ADMIN_PREFIX}/competition`, input);
    return config;
  },
};

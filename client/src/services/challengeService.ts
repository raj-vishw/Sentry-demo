import type {
  Achievement,
  Category,
  Challenge,
  ChallengeInstance,
  ChallengeStatus,
  ChallengeType,
  Difficulty,
  Hint,
  Pagination,
  PublicEnvironment,
} from '@/types';
import { apiClient } from '@/lib/apiClient';

interface BackendHint {
  id: string;
  title: string;
  cost: number;
  order: number;
  unlocked: boolean;
  content: string | null;
}

interface BackendChallengeListItem {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  tags: string[];
  category: Category;
  type: ChallengeType;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'INSANE';
  points: number;
  solves: number;
  published: boolean;
  status: ChallengeStatus;
  solved: boolean;
  locked: boolean;
  createdAt: string;
}

interface BackendChallengeDetail extends BackendChallengeListItem {
  description: string;
  flagFormat: string;
  author: string;
  files: { id: string; filename: string; size: number; mimeType: string }[];
  hints: BackendHint[];
  firstBlood: { username: string; solvedAt: string } | null;
  unlockRequirement: { title: string; slug: string } | null;
  environment: PublicEnvironment | null;
}

export const DIFFICULTY_TO_FRONTEND: Record<BackendChallengeListItem['difficulty'], Difficulty> = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  INSANE: 'insane',
};
export const DIFFICULTY_TO_BACKEND: Record<Difficulty, BackendChallengeListItem['difficulty']> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
  insane: 'INSANE',
};

function toFrontendHint(hint: BackendHint): Hint {
  return {
    id: hint.id,
    title: hint.title,
    cost: hint.cost,
    content: hint.content,
    unlocked: hint.unlocked,
  };
}

function toFrontendSummary(item: BackendChallengeListItem): Challenge {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    shortDescription: item.shortDescription,
    category: item.category,
    type: item.type,
    difficulty: DIFFICULTY_TO_FRONTEND[item.difficulty],
    points: item.points,
    // Not returned by the list endpoint — only ever read from the detail
    // fetch. Kept here only so `Challenge` has one consistent shape.
    description: '',
    solveCount: item.solves,
    solved: item.solved,
    author: '',
    files: [],
    hints: [],
    tags: item.tags,
    published: item.published,
    status: item.status,
    createdAt: item.createdAt,
    locked: item.locked,
    firstBlood: null,
    unlockRequirement: null,
    environment: null,
  };
}

function toFrontendDetail(item: BackendChallengeDetail): Challenge {
  return {
    ...toFrontendSummary(item),
    description: item.description,
    author: item.author,
    files: item.files.map((f) => ({
      id: f.id,
      name: f.filename,
      sizeKb: Math.max(1, Math.round(f.size / 1024)),
      url: `/api/v1/challenges/${item.id}/files/${f.id}/download`,
    })),
    hints: item.hints.map(toFrontendHint),
    firstBlood: item.firstBlood,
    unlockRequirement: item.unlockRequirement,
    environment: item.environment,
  };
}

interface BackendChallengeInstance {
  id: string;
  challengeId: string;
  status: ChallengeInstance['status'];
  endpoint: string | null;
  failureReason: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface ChallengeListParams {
  search?: string;
  category?: Category;
  difficulty?: Difficulty;
  solved?: 'solved' | 'unsolved';
  minPoints?: number;
  maxPoints?: number;
  sort?: 'newest' | 'points-asc' | 'points-desc' | 'solves';
  page?: number;
  limit?: number;
}

function buildQuery(params: ChallengeListParams): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export const challengeService = {
  async list(params: ChallengeListParams = {}): Promise<{ challenges: Challenge[]; pagination: Pagination }> {
    const res = await apiClient.get<{ challenges: BackendChallengeListItem[]; pagination: Pagination }>(
      `/challenges${buildQuery(params)}`,
    );
    return { challenges: res.challenges.map(toFrontendSummary), pagination: res.pagination };
  },

  async getBySlug(slug: string): Promise<Challenge | null> {
    try {
      const { challenge } = await apiClient.get<{ challenge: BackendChallengeDetail }>(`/challenges/${slug}`);
      return toFrontendDetail(challenge);
    } catch {
      return null;
    }
  },

  async submitFlag(
    challengeId: string,
    flag: string,
  ): Promise<{
    correct: boolean;
    alreadySolved: boolean;
    message: string;
    pointsAwarded: number;
    newAchievements: Achievement[];
  }> {
    return apiClient.post(`/challenges/${challengeId}/submit`, { flag });
  },

  async unlockHint(challengeId: string, hintId: string): Promise<{ content: string }> {
    return apiClient.post(`/challenges/${challengeId}/hints/${hintId}/unlock`);
  },

  // --- Interactive instances ---
  // See docs/challenges/interactive-challenges.md — this calls real
  // endpoints with real ownership/authorization, but the only runtime
  // behind them today always reports back FAILED (no container execution
  // is wired up yet). The UI reflects that honestly rather than faking it.

  async createInstance(challengeId: string): Promise<ChallengeInstance> {
    const { instance } = await apiClient.post<{ instance: BackendChallengeInstance }>(
      `/challenges/${challengeId}/instances`,
    );
    return instance;
  },

  async getInstance(instanceId: string): Promise<ChallengeInstance> {
    const { instance } = await apiClient.get<{ instance: BackendChallengeInstance }>(
      `/challenge-instances/${instanceId}`,
    );
    return instance;
  },

  /**
   * Challenge file downloads require the Bearer token, which a plain
   * `<a href>` click can't send — this fetches the bytes authenticated and
   * triggers the save via a throwaway object URL instead.
   */
  async downloadFile(challengeId: string, fileId: string, filename: string): Promise<void> {
    const blob = await apiClient.getBlob(`/challenges/${challengeId}/files/${fileId}/download`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

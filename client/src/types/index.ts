export type Role = 'user' | 'admin';

export type Category =
  | 'web'
  | 'crypto'
  | 'forensics'
  | 'reverse'
  | 'pwn'
  | 'osint'
  | 'cloud'
  | 'mobile';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'insane';

export type ChallengeType = 'STATIC' | 'INTERACTIVE' | 'HYBRID';
export type ChallengeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type EnvironmentProtocol = 'HTTP' | 'TCP' | 'UDP';

export interface PublicEnvironment {
  protocol: EnvironmentProtocol;
  port: number | null;
  timeoutSeconds: number;
}

export interface ChallengeEnvironment {
  runtime: 'DOCKER';
  image: string | null;
  port: number | null;
  protocol: EnvironmentProtocol;
  cpuLimit: number;
  memoryLimitMb: number;
  timeoutSeconds: number;
}

export interface ChallengeInstance {
  id: string;
  challengeId: string;
  status: 'STARTING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'FAILED' | 'EXPIRED';
  endpoint: string | null;
  failureReason: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  xp: number;
  rank: number;
  solvedCount: number;
  streak: number;
  teamId: string | null;
  teamName: string | null;
  createdAt: string;
}

export interface AuthCredentials {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface Hint {
  id: string;
  title?: string;
  cost: number;
  content: string | null;
  unlocked: boolean;
}

export interface ChallengeFile {
  id: string;
  name: string;
  sizeKb: number;
  url: string;
}

export interface FirstBlood {
  username: string;
  solvedAt: string;
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  category: Category;
  type: ChallengeType;
  difficulty: Difficulty;
  points: number;
  description: string;
  solveCount: number;
  solved: boolean;
  author: string;
  files: ChallengeFile[];
  hints: Hint[];
  tags: string[];
  published?: boolean;
  status: ChallengeStatus;
  createdAt: string;
  /** True when a prerequisite exists and the viewer hasn't solved it yet. */
  locked: boolean;
  firstBlood: FirstBlood | null;
  /** Only populated when `locked` is true. */
  unlockRequirement: { title: string; slug: string } | null;
  environment: PublicEnvironment | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  xp: number;
  solvedCount: number;
  teamName: string | null;
  onPage?: boolean;
}

export interface TeamLeaderboardEntry {
  rank: number;
  teamId: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  xp: number;
  solvedCount: number;
  memberCount: number;
}

export type TeamRole = 'owner' | 'member';

export interface TeamMember {
  userId: string;
  username: string;
  avatarUrl?: string;
  role: TeamRole;
  xp: number;
  solvedCount: number;
  joinedAt: string;
}

export interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatarUrl?: string;
  xp: number;
  solvedCount: number;
  memberCount: number;
  createdAt: string;
  hidden: boolean;
}

export interface Team extends TeamSummary {
  /** Only present for members of the team — never leaked to outsiders. */
  inviteCode: string | null;
  members: TeamMember[];
  categoryProgress: CategoryProgress[];
}

export interface CategorySummary {
  id: Category;
  name: string;
  description: string;
  challengeCount: number;
}

export interface PlatformStats {
  challenges: number;
  categories: number;
  solves: number;
  players: number;
}

export interface CategoryProgress {
  category: Category;
  solved: number;
  total: number;
}

export interface RecentSolve {
  id: string;
  challengeTitle: string;
  category: Category;
  points: number;
  solvedAt: string;
}

// --- Admin: platform overview & analytics ---

export interface PlatformOverview {
  totalUsers: number;
  activeUsers: number;
  totalChallenges: number;
  publishedChallenges: number;
  totalTeams: number;
  totalSubmissions: number;
  successfulSubmissions: number;
  totalSolves: number;
  publishedWriteups: number;
}

export type StatsRange = '24h' | '7d' | '30d' | '90d' | 'all';

export interface UserStats {
  range: StatsRange;
  newUsers: number;
  activeUsers: number;
  registrationsOverTime: { date: string; count: number }[];
}

export interface ChallengeStats {
  range: StatsRange;
  totalChallenges: number;
  published: number;
  draft: number;
  unsolvedChallenges: number;
  totalSolves: number;
  averageSolves: number;
  solvesInRange: number;
  categoryDistribution: { category: Category; challengeCount: number; solveCount: number }[];
  difficultyDistribution: { difficulty: string; challengeCount: number; solveCount: number }[];
}

export interface SubmissionStats {
  range: StatsRange;
  total: number;
  correct: number;
  incorrect: number;
  successRate: number;
  topAttempted: { challengeId: string; title: string; attempts: number; successes: number; successRate: number }[];
}

export interface TeamStats {
  range: StatsRange;
  totalTeams: number;
  activeTeams: number;
  averageTeamSize: number;
  totalTeamPoints: number;
  totalTeamSolves: number;
}

export interface WriteupStats {
  range: StatsRange;
  total: number;
  published: number;
  pending: number;
  rejected: number;
  totalViews: number;
  totalLikes: number;
  topViewed: { id: string; title: string; slug: string; views: number; likesCount: number }[];
}

// --- Admin: users ---

export type AccountStatus = 'ACTIVE' | 'DISABLED' | 'BANNED' | 'PENDING';

export interface AdminUserListItem {
  id: string;
  username: string;
  email: string;
  role: Role;
  status: AccountStatus;
  points: number;
  solvedCount: number;
  teamId: string | null;
  teamName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  hidden: boolean;
}

export interface AdminUserDetail extends AdminUserListItem {
  bio: string;
  streak: number;
  submissionCount: number;
  correctSubmissionCount: number;
  recentSolves: { challengeId: string; title: string; points: number; solvedAt: string }[];
  badges: Achievement[];
}

// --- Admin: platform settings ---

export interface SystemConfig {
  platformName: string;
  platformDescription: string;
  registrationEnabled: boolean;
  registrationRequiresApproval: boolean;
  maintenanceMode: boolean;
  setupCompleted: boolean;
  logoUrl: string | null;
  faviconUrl: string | null;
  accentColor: string | null;
  bootMessage: string | null;
}

export type LeaderboardVisibility = 'public' | 'hidden';

export interface CompetitionConfig {
  name: string;
  description: string;
  rules: string;
  startTime: string | null;
  endTime: string | null;
  freezeTime: string | null;
  leaderboardVisibility: LeaderboardVisibility;
}

// --- Admin: submissions ---

export interface AdminSubmission {
  id: string;
  username: string;
  challengeId: string;
  challengeTitle: string;
  category: Category;
  correct: boolean;
  pointsAwarded: number;
  ip: string | null;
  createdAt: string;
  /** Descriptive only — flags a submission burst worth a human look, never an accusation. */
  flaggedForReview: boolean;
}

// --- Admin: categories ---

export interface AdminCategory {
  slug: Category;
  name: string;
  description: string;
  icon: string;
  active: boolean;
}

export interface AdminAnnouncement {
  id: string;
  message: string;
  createdAt: string;
}

export interface AdminPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

// --- Admin: audit log ---

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorUsername: string | null;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// --- Writeups ---

export type WriteupStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

export interface WriteupListItem {
  id: string;
  title: string;
  slug: string;
  challengeId: string;
  challengeTitle: string;
  category: Category;
  authorId: string;
  author: string;
  status: WriteupStatus;
  views: number;
  likesCount: number;
  publishedAt: string | null;
  createdAt: string;
}

export interface WriteupDetail extends WriteupListItem {
  content: string;
  /** Only populated for the author or an admin — never on a public read. */
  rejectionReason: string | null;
  likedByViewer: boolean;
}

// --- Achievements ---

export interface Achievement {
  type: string;
  awardedAt: string;
}

// --- Public profile ---

export interface PublicProfile {
  username: string;
  avatarUrl?: string;
  bio: string;
  points: number;
  rank: number;
  solvedCount: number;
  streak: number;
  teamName: string | null;
  createdAt: string;
  badges: Achievement[];
  writeups: WriteupListItem[];
}

// --- Reports ---

export type ReportStatus = 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

export interface Report {
  id: string;
  reporterId: string;
  reporterUsername: string | null;
  targetType: 'writeup';
  targetId: string;
  targetTitle: string | null;
  reason: string;
  status: ReportStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

import { lazy } from 'react';
import {
  LayoutDashboard,
  Flag,
  Trophy,
  Users,
  CircleUser,
  NotebookPen,
  FolderOpen,
  Settings as SettingsIcon,
  ListChecks,
  ShieldCheck,
  BookOpen,
  PenLine,
} from 'lucide-react';
import type { AppDefinition } from '../types';

// Lazy so that CommandPalette — mounted globally, even for logged-out
// visitors — never forces the whole authenticated app into the initial
// bundle just by referencing this registry.
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ChallengesPage = lazy(() =>
  import('@/features/challenges/ChallengesPage').then((m) => ({ default: m.ChallengesPage })),
);
const LeaderboardPage = lazy(() =>
  import('@/features/leaderboard/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })),
);
const TeamsPage = lazy(() => import('@/features/teams/TeamsPage').then((m) => ({ default: m.TeamsPage })));
const ProfilePage = lazy(() =>
  import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const WriteupsPage = lazy(() =>
  import('@/features/writeups/WriteupsPage').then((m) => ({ default: m.WriteupsPage })),
);
const WriteupEditorPage = lazy(() =>
  import('@/features/writeups/WriteupEditorPage').then((m) => ({ default: m.WriteupEditorPage })),
);
const LaboratoryApp = lazy(() => import('./LaboratoryApp').then((m) => ({ default: m.LaboratoryApp })));
const WriteupDetailApp = lazy(() => import('./WriteupDetailApp').then((m) => ({ default: m.WriteupDetailApp })));
const PublicProfileApp = lazy(() => import('./PublicProfileApp').then((m) => ({ default: m.PublicProfileApp })));
const NotesApp = lazy(() => import('./NotesApp').then((m) => ({ default: m.NotesApp })));
const FilesApp = lazy(() => import('./FilesApp').then((m) => ({ default: m.FilesApp })));
const SettingsApp = lazy(() => import('./SettingsApp').then((m) => ({ default: m.SettingsApp })));
const TaskManagerApp = lazy(() => import('./TaskManagerApp').then((m) => ({ default: m.TaskManagerApp })));
const AdminConsoleApp = lazy(() => import('./AdminConsoleApp').then((m) => ({ default: m.AdminConsoleApp })));

export const APP_REGISTRY: Record<string, AppDefinition> = {
  dashboard: {
    id: 'dashboard',
    title: 'Observatory',
    icon: LayoutDashboard,
    routePattern: '/app/dashboard',
    buildPath: () => '/app/dashboard',
    defaultSize: { width: 920, height: 640 },
    minSize: { width: 420, height: 360 },
    component: DashboardPage,
    pinned: true,
  },
  explore: {
    id: 'explore',
    title: 'Explore',
    icon: Flag,
    routePattern: '/app/challenges',
    buildPath: () => '/app/challenges',
    defaultSize: { width: 900, height: 620 },
    minSize: { width: 420, height: 360 },
    component: ChallengesPage,
    pinned: true,
  },
  laboratory: {
    id: 'laboratory',
    title: 'Laboratory',
    icon: ShieldCheck,
    routePattern: '/app/challenges/:slug',
    buildPath: (params) => `/app/challenges/${params.slug}`,
    defaultSize: { width: 1040, height: 680 },
    minSize: { width: 440, height: 400 },
    component: LaboratoryApp,
    singleInstance: true,
    launchable: false,
  },
  leaderboard: {
    id: 'leaderboard',
    title: 'Leaderboard',
    icon: Trophy,
    routePattern: '/app/leaderboard',
    buildPath: () => '/app/leaderboard',
    defaultSize: { width: 760, height: 620 },
    minSize: { width: 380, height: 360 },
    component: LeaderboardPage,
    pinned: true,
  },
  teams: {
    id: 'teams',
    title: 'Teams',
    icon: Users,
    routePattern: '/app/teams',
    buildPath: () => '/app/teams',
    defaultSize: { width: 800, height: 600 },
    minSize: { width: 380, height: 360 },
    component: TeamsPage,
  },
  profile: {
    id: 'profile',
    title: 'Profile',
    icon: CircleUser,
    routePattern: '/app/profile',
    buildPath: () => '/app/profile',
    defaultSize: { width: 820, height: 640 },
    minSize: { width: 380, height: 360 },
    component: ProfilePage,
  },
  // Registered after the static `/profile` app above — resolveAppFromPath
  // checks routePatterns in insertion order, so the static path must be
  // tried first (same rule documented below for writeupCreate/writeupDetail).
  publicProfile: {
    id: 'publicProfile',
    title: 'Operator Profile',
    icon: CircleUser,
    routePattern: '/app/profile/:username',
    buildPath: (params) => `/app/profile/${params.username}`,
    defaultSize: { width: 820, height: 680 },
    minSize: { width: 380, height: 400 },
    component: PublicProfileApp,
    singleInstance: true,
    launchable: false,
  },
  writeups: {
    id: 'writeups',
    title: 'Writeups',
    icon: BookOpen,
    routePattern: '/app/writeups',
    buildPath: () => '/app/writeups',
    defaultSize: { width: 900, height: 640 },
    minSize: { width: 420, height: 360 },
    component: WriteupsPage,
  },
  // Registered before `writeupDetail` — resolveAppFromPath checks routePatterns
  // in insertion order and returns the first match, so the static
  // '/writeups/create' must be tried before the dynamic '/writeups/:slug'.
  writeupCreate: {
    id: 'writeupCreate',
    title: 'Write a Writeup',
    icon: PenLine,
    routePattern: '/app/writeups/create',
    buildPath: () => '/app/writeups/create',
    defaultSize: { width: 820, height: 680 },
    minSize: { width: 420, height: 420 },
    component: WriteupEditorPage,
    singleInstance: true,
    launchable: false,
  },
  writeupEdit: {
    id: 'writeupEdit',
    title: 'Edit Writeup',
    icon: PenLine,
    routePattern: '/app/writeups/:slug/edit',
    buildPath: (params) => `/app/writeups/${params.slug}/edit`,
    defaultSize: { width: 820, height: 680 },
    minSize: { width: 420, height: 420 },
    component: WriteupEditorPage,
    singleInstance: true,
    launchable: false,
  },
  writeupDetail: {
    id: 'writeupDetail',
    title: 'Writeup',
    icon: BookOpen,
    routePattern: '/app/writeups/:slug',
    buildPath: (params) => `/app/writeups/${params.slug}`,
    defaultSize: { width: 820, height: 680 },
    minSize: { width: 420, height: 380 },
    component: WriteupDetailApp,
    singleInstance: true,
    launchable: false,
  },
  notes: {
    id: 'notes',
    title: 'Notes',
    icon: NotebookPen,
    defaultSize: { width: 640, height: 480 },
    minSize: { width: 340, height: 300 },
    component: NotesApp,
  },
  files: {
    id: 'files',
    title: 'Files',
    icon: FolderOpen,
    defaultSize: { width: 640, height: 480 },
    minSize: { width: 340, height: 300 },
    component: FilesApp,
  },
  taskmanager: {
    id: 'taskmanager',
    title: 'Task Manager',
    icon: ListChecks,
    defaultSize: { width: 460, height: 480 },
    minSize: { width: 320, height: 300 },
    component: TaskManagerApp,
  },
  settings: {
    id: 'settings',
    title: 'Settings',
    icon: SettingsIcon,
    defaultSize: { width: 600, height: 640 },
    minSize: { width: 340, height: 400 },
    component: SettingsApp,
    pinned: true,
  },
  admin: {
    id: 'admin',
    title: 'Admin Console',
    icon: ShieldCheck,
    routePattern: '/app/admin/*',
    buildPath: (params) => params.section ?? '/app/admin',
    defaultSize: { width: 1000, height: 680 },
    minSize: { width: 480, height: 420 },
    component: AdminConsoleApp,
    adminOnly: true,
    pinned: true,
  },
};

export function getApp(id: string): AppDefinition | undefined {
  return APP_REGISTRY[id];
}

export function listApps(opts?: { isAdmin?: boolean }): AppDefinition[] {
  return Object.values(APP_REGISTRY).filter((app) => {
    if (app.launchable === false) return false;
    if (app.adminOnly && !opts?.isAdmin) return false;
    return true;
  });
}

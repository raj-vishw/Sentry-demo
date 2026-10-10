import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ErrorState } from '@/components/feedback/ErrorState';
import { chartTooltipStyle } from '@/lib/chartTheme';
import { CATEGORY_META } from '@/lib/categories';
import {
  useUserStats,
  useChallengeStats,
  useSubmissionStats,
  useTeamStats,
  useWriteupStats,
} from './hooks/useAdmin';
import type { StatsRange } from '@/types';

const RANGES: { value: StatsRange; label: string }[] = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

const SECTION_TABS = [
  { value: 'Users', label: 'Users' },
  { value: 'Challenges', label: 'Challenges' },
  { value: 'Submissions', label: 'Submissions' },
  { value: 'Teams', label: 'Teams' },
  { value: 'Writeups', label: 'Writeups' },
] as const;
type Section = (typeof SECTION_TABS)[number]['value'];

function UsersSection({ range }: { range: StatsRange }) {
  const { data, isLoading, isError, refetch } = useUserStats(range);
  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Stat label="New users" value={data.newUsers} />
          <Stat label="Active users" value={data.activeUsers} />
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Registrations</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.registrationsOverTime}>
              <defs>
                <linearGradient id="registrationsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="count" stroke="var(--color-accent)" fill="url(#registrationsFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function ChallengesSection({ range }: { range: StatsRange }) {
  const { data, isLoading, isError, refetch } = useChallengeStats(range);
  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Published / Total" value={`${data.published} / ${data.totalChallenges}`} card />
        <Stat label="Unsolved" value={data.unsolvedChallenges} card />
        <Stat label="Avg. solves" value={data.averageSolves.toFixed(1)} card />
        <Stat label="Solves in range" value={data.solvesInRange} card />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By Category</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryDistribution.map((c) => ({ ...c, name: CATEGORY_META[c.category]?.name ?? c.category }))}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'var(--color-surface-hover)' }} />
                <Bar dataKey="challengeCount" name="Challenges" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By Difficulty</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.difficultyDistribution}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="difficulty" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'var(--color-surface-hover)' }} />
                <Bar dataKey="challengeCount" name="Challenges" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SubmissionsSection({ range }: { range: StatsRange }) {
  const { data, isLoading, isError, refetch } = useSubmissionStats(range);
  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total" value={data.total} card />
        <Stat label="Correct" value={data.correct} card />
        <Stat label="Incorrect" value={data.incorrect} card />
        <Stat label="Success rate" value={`${data.successRate.toFixed(1)}%`} card />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Most Attempted Challenges</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-[var(--color-border)]">
          {data.topAttempted.length === 0 && (
            <p className="py-4 text-sm text-[var(--color-text-muted)]">No submissions in this range.</p>
          )}
          {data.topAttempted.map((t) => (
            <div key={t.challengeId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 text-sm">
              <span className="font-medium text-[var(--color-text-primary)]">{t.title}</span>
              <span className="font-mono text-xs text-[var(--color-text-muted)]">
                {t.attempts} attempts · {t.successRate.toFixed(1)}% success
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TeamsSection({ range }: { range: StatsRange }) {
  const { data, isLoading, isError, refetch } = useTeamStats(range);
  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Stat label="Total teams" value={data.totalTeams} card />
      <Stat label="Active teams" value={data.activeTeams} card />
      <Stat label="Avg. team size" value={data.averageTeamSize.toFixed(1)} card />
      <Stat label="Total team points" value={data.totalTeamPoints.toLocaleString()} card />
    </div>
  );
}

function WriteupsSection({ range }: { range: StatsRange }) {
  const { data, isLoading, isError, refetch } = useWriteupStats(range);
  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Published" value={data.published} card />
        <Stat label="Pending review" value={data.pending} card />
        <Stat label="Rejected" value={data.rejected} card />
        <Stat label="Total views" value={data.totalViews.toLocaleString()} card />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Most Viewed</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-[var(--color-border)]">
          {data.topViewed.length === 0 && (
            <p className="py-4 text-sm text-[var(--color-text-muted)]">No published writeups yet.</p>
          )}
          {data.topViewed.map((w) => (
            <div key={w.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 text-sm">
              <span className="font-medium text-[var(--color-text-primary)]">{w.title}</span>
              <span className="font-mono text-xs text-[var(--color-text-muted)]">
                {w.views} views · {w.likesCount} likes
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, card }: { label: string; value: string | number; card?: boolean }) {
  const content = (
    <>
      <p className="font-display text-xl font-bold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
    </>
  );
  if (!card) return <div className="flex flex-col gap-0.5">{content}</div>;
  return (
    <Card>
      <CardContent className="flex flex-col gap-0.5 p-4">{content}</CardContent>
    </Card>
  );
}

const SECTION_COMPONENTS: Record<Section, (props: { range: StatsRange }) => React.JSX.Element> = {
  Users: UsersSection,
  Challenges: ChallengesSection,
  Submissions: SubmissionsSection,
  Teams: TeamsSection,
  Writeups: WriteupsSection,
};

export function AdminStatisticsPage() {
  const [range, setRange] = useState<StatsRange>('7d');

  return (
    <PageContainer className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">Statistics</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Descriptive platform-wide analytics.</p>
        </div>
        <Select
          aria-label="Time range"
          value={range}
          onChange={(e) => setRange(e.target.value as StatsRange)}
          className="w-auto"
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>

      <Tabs items={[...SECTION_TABS]} defaultValue="Users">
        {(active) => {
          const Section = SECTION_COMPONENTS[active as Section];
          return <Section range={range} />;
        }}
      </Tabs>
    </PageContainer>
  );
}

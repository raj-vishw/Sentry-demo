import { Flag, ListChecks, Shield, Users, FileText, CheckCircle2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useOverviewStats } from './hooks/useAdmin';

export function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useOverviewStats();

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingSpinner label="Loading operations center..." />
      </PageContainer>
    );
  }

  if (isError || !data) {
    return (
      <PageContainer>
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-col gap-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-secondary-hover)]">
          CTF//CONTROL
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
          Platform Overview
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {data.activeUsers.toLocaleString()} operators active in the last 7 days.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Users" value={data.totalUsers.toLocaleString()} accent="secondary" />
        <StatCard
          icon={Flag}
          label="Challenges"
          value={`${data.publishedChallenges} / ${data.totalChallenges}`}
          accent="secondary"
        />
        <StatCard icon={Shield} label="Teams" value={data.totalTeams.toLocaleString()} accent="secondary" />
        <StatCard icon={FileText} label="Writeups" value={data.publishedWriteups.toLocaleString()} accent="secondary" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={ListChecks} label="Submissions" value={data.totalSubmissions.toLocaleString()} />
        <StatCard icon={CheckCircle2} label="Successful" value={data.successfulSubmissions.toLocaleString()} />
        <StatCard icon={CheckCircle2} label="Total Solves" value={data.totalSolves.toLocaleString()} />
      </div>
    </PageContainer>
  );
}

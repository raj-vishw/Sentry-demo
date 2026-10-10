import { useState } from 'react';
import { ListChecks, TriangleAlert, Download, Ban } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { CATEGORY_META } from '@/lib/categories';
import { formatRelativeTime } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAdminSubmissions, useInvalidateSubmission } from './hooks/useAdmin';
import { adminService } from '@/services/adminService';
import { useUiStore } from '@/stores/uiStore';
import type { AdminSubmission } from '@/types';

export function AdminSubmissionsPage() {
  const [username, setUsername] = useState('');
  const [result, setResult] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [page, setPage] = useState(1);
  const [pendingInvalidateId, setPendingInvalidateId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedUsername = useDebouncedValue(username, 300);
  const pushToast = useUiStore((s) => s.pushToast);
  const invalidateSubmission = useInvalidateSubmission();

  const filters = {
    username: debouncedUsername || undefined,
    result: result === 'all' ? undefined : result,
  };
  const { data, isLoading, isError, refetch } = useAdminSubmissions({ ...filters, page, limit: 25 });

  async function handleExport() {
    setIsExporting(true);
    try {
      await adminService.exportSubmissionsCsv(filters);
    } catch {
      pushToast({ title: 'Export failed', variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  }

  const columns: DataTableColumn<AdminSubmission>[] = [
    {
      key: 'user',
      header: 'User',
      render: (s) => (
        <span className="flex items-center gap-2 font-medium text-[var(--color-text-primary)]">
          {s.username}
          {s.flaggedForReview && (
            <span title="Activity requiring review">
              <TriangleAlert className="size-3.5 text-[var(--color-warning)]" aria-hidden="true" />
            </span>
          )}
        </span>
      ),
    },
    { key: 'challenge', header: 'Challenge', render: (s) => s.challengeTitle },
    { key: 'category', header: 'Category', render: (s) => CATEGORY_META[s.category]?.name ?? s.category },
    {
      key: 'result',
      header: 'Result',
      render: (s) => <Badge variant={s.correct ? 'success' : 'error'}>{s.correct ? 'Correct' : 'Incorrect'}</Badge>,
    },
    { key: 'points', header: 'Points', className: 'text-right', render: (s) => (s.pointsAwarded > 0 ? `+${s.pointsAwarded}` : '—') },
    { key: 'time', header: 'Time', className: 'text-right', render: (s) => <span className="font-mono text-xs">{formatRelativeTime(s.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (s) =>
        s.correct && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPendingInvalidateId(s.id);
            }}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
            aria-label={`Invalidate submission from ${s.username}`}
            title="Mark incorrect — reverses points and solve count"
          >
            <Ban className="size-4" />
          </button>
        ),
    },
  ];

  return (
    <PageContainer className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">Submissions</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {data?.pagination.total ?? 0} total submissions. A warning icon flags unusually frequent activity for
            review — it's a signal, not a verdict.
          </p>
        </div>
        <Button variant="outline" leftIcon={<Download className="size-4" />} isLoading={isExporting} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput
          placeholder="Search by username..."
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setPage(1);
          }}
          aria-label="Search by username"
          className="max-w-sm flex-1"
        />
        <Select
          aria-label="Filter by result"
          value={result}
          onChange={(e) => {
            setResult(e.target.value as typeof result);
            setPage(1);
          }}
          className="w-auto"
        >
          <option value="all">All results</option>
          <option value="correct">Correct</option>
          <option value="incorrect">Incorrect</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.submissions ?? []}
        rowKey={(s) => s.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyIcon={ListChecks}
        emptyTitle="No submissions match these filters"
      />

      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />}

      <ConfirmDialog
        open={!!pendingInvalidateId}
        onClose={() => setPendingInvalidateId(null)}
        onConfirm={async () => {
          if (!pendingInvalidateId) return;
          try {
            await invalidateSubmission.mutateAsync(pendingInvalidateId);
            pushToast({ title: 'Submission invalidated', description: 'Points and solve count reversed.', variant: 'info' });
          } catch {
            pushToast({ title: 'Could not invalidate submission', variant: 'error' });
          } finally {
            setPendingInvalidateId(null);
          }
        }}
        title="Invalidate submission"
        description="This marks the submission incorrect and reverses the points, solve count, and leaderboard effect it had. The user can solve the challenge again afterward. This cannot be undone."
        confirmLabel="Invalidate"
        variant="danger"
        isLoading={invalidateSubmission.isPending}
      />
    </PageContainer>
  );
}

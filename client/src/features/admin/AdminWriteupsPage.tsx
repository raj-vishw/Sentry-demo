import { useState } from 'react';
import { FileText, Flag as FlagIcon } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import {
  useAdminWriteups,
  useApproveWriteup,
  useRejectWriteup,
  useArchiveWriteup,
  useAdminReports,
  useReviewReport,
} from './hooks/useAdmin';
import type { Report, WriteupDetail, WriteupStatus } from '@/types';

const STATUS_TABS: { value: WriteupStatus; label: string }[] = [
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function RejectModal({ writeup, onClose }: { writeup: WriteupDetail | null; onClose: () => void }) {
  const reject = useRejectWriteup();
  const [reason, setReason] = useState('');

  if (!writeup) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reject.mutate({ id: writeup!.id, reason }, { onSuccess: onClose });
  }

  return (
    <Modal open onClose={onClose} title={`Reject "${writeup.title}"`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
            Reason (shown to the author)
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={3}
            rows={4}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none"
          />
        </label>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm" isLoading={reject.isPending}>
            Reject writeup
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function WriteupsTab({ status }: { status: WriteupStatus }) {
  const { data, isLoading, isError, refetch } = useAdminWriteups({ status, limit: 50 });
  const approve = useApproveWriteup();
  const archive = useArchiveWriteup();
  const [rejecting, setRejecting] = useState<WriteupDetail | null>(null);

  const columns: DataTableColumn<WriteupDetail>[] = [
    { key: 'title', header: 'Title', render: (w) => <span className="font-medium text-[var(--color-text-primary)]">{w.title}</span> },
    { key: 'author', header: 'Author', render: (w) => w.author },
    { key: 'challenge', header: 'Challenge', render: (w) => w.challengeTitle },
    { key: 'views', header: 'Views', className: 'text-right', render: (w) => w.views },
    { key: 'likes', header: 'Likes', className: 'text-right', render: (w) => w.likesCount },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (w) => (
        <div className="flex justify-end gap-2">
          {status === 'PENDING_REVIEW' && (
            <>
              <Button size="sm" variant="primary" onClick={() => approve.mutate(w.id)} isLoading={approve.isPending}>
                Approve
              </Button>
              <Button size="sm" variant="danger" onClick={() => setRejecting(w)}>
                Reject
              </Button>
            </>
          )}
          {(status === 'PUBLISHED' || status === 'REJECTED') && (
            <Button size="sm" variant="outline" onClick={() => archive.mutate(w.id)} isLoading={archive.isPending}>
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={data?.writeups ?? []}
        rowKey={(w) => w.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyIcon={FileText}
        emptyTitle={`No ${STATUS_TABS.find((t) => t.value === status)?.label.toLowerCase()} writeups`}
      />
      <RejectModal writeup={rejecting} onClose={() => setRejecting(null)} />
    </>
  );
}

const REPORT_STATUS_VARIANT: Record<Report['status'], 'warning' | 'success' | 'default'> = {
  OPEN: 'warning',
  REVIEWING: 'warning',
  RESOLVED: 'success',
  DISMISSED: 'default',
};

function ReportsTab() {
  const { data, isLoading, isError, refetch } = useAdminReports();
  const review = useReviewReport();

  const columns: DataTableColumn<Report>[] = [
    { key: 'target', header: 'Writeup', render: (r) => r.targetTitle ?? '(deleted)' },
    { key: 'reporter', header: 'Reported by', render: (r) => r.reporterUsername ?? '—' },
    { key: 'reason', header: 'Reason', render: (r) => <span className="text-xs">{r.reason}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge variant={REPORT_STATUS_VARIANT[r.status]}>{r.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) =>
        ['OPEN', 'REVIEWING'].includes(r.status) ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => review.mutate({ id: r.id, action: 'dismiss' })}>
              Dismiss
            </Button>
            <Button size="sm" variant="primary" onClick={() => review.mutate({ id: r.id, action: 'resolve' })}>
              Resolve
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={data?.reports ?? []}
      rowKey={(r) => r.id}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      emptyIcon={FlagIcon}
      emptyTitle="No reports"
    />
  );
}

export function AdminWriteupsPage() {
  return (
    <PageContainer className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">Writeups</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Moderate community writeups and review reported content.
        </p>
      </div>

      <Tabs items={[...STATUS_TABS, { value: 'REPORTS', label: 'Reports' }]} defaultValue="PENDING_REVIEW">
        {(active) => (active === 'REPORTS' ? <ReportsTab /> : <WriteupsTab status={active as WriteupStatus} />)}
      </Tabs>
    </PageContainer>
  );
}

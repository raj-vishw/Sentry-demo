import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuditLogs } from './hooks/useAdmin';
import type { AuditLogEntry } from '@/types';

// Mirrors the backend's `AuditAction` union (server/src/services/auditLog.service.ts) —
// the action field is an exact match, not a substring search, so this is a
// Select of the known, finite set rather than free text.
const AUDIT_ACTIONS = [
  'ADMIN_CREATED_CHALLENGE',
  'ADMIN_UPDATED_CHALLENGE',
  'ADMIN_DELETED_CHALLENGE',
  'ADMIN_PUBLISHED_CHALLENGE',
  'ADMIN_UNPUBLISHED_CHALLENGE',
  'ADMIN_DISABLED_USER',
  'ADMIN_ENABLED_USER',
  'ADMIN_UPDATED_CATEGORY',
  'ADMIN_APPROVED_WRITEUP',
  'ADMIN_REJECTED_WRITEUP',
  'ADMIN_ARCHIVED_WRITEUP',
  'ADMIN_RESOLVED_REPORT',
  'ADMIN_DISMISSED_REPORT',
] as const;

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

function actionLabel(action: string): string {
  return action.replace(/^ADMIN_/, '').replace(/_/g, ' ');
}

export function AdminAuditLogPage() {
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const debouncedActor = useDebouncedValue(actor, 300);

  const { data, isLoading, isError, refetch } = useAuditLogs({
    actor: debouncedActor || undefined,
    action: action || undefined,
    page,
    limit: 25,
  });

  const columns: DataTableColumn<AuditLogEntry>[] = [
    { key: 'time', header: 'Time', render: (e) => <span className="font-mono text-xs">{formatTimestamp(e.createdAt)}</span> },
    { key: 'actor', header: 'Actor', render: (e) => e.actorUsername ?? '—' },
    { key: 'action', header: 'Action', render: (e) => <Badge variant="accent">{actionLabel(e.action)}</Badge> },
    { key: 'resource', header: 'Resource', render: (e) => <span className="font-mono text-xs">{e.resourceType}:{e.resourceId.slice(-6)}</span> },
    {
      key: 'metadata',
      header: 'Details',
      render: (e) => (
        <span className="font-mono text-xs text-[var(--color-text-muted)]">
          {Object.keys(e.metadata).length > 0 ? JSON.stringify(e.metadata) : '—'}
        </span>
      ),
    },
  ];

  return (
    <PageContainer className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">Audit Log</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Append-only record of every administrative mutation — who, what, when, which resource.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput
          placeholder="Exact actor username..."
          value={actor}
          onChange={(e) => {
            setActor(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by actor"
          className="max-w-sm flex-1"
        />
        <Select
          aria-label="Filter by action"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="w-auto"
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.entries ?? []}
        rowKey={(e) => e.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyIcon={ScrollText}
        emptyTitle="No audit entries match these filters"
      />

      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />}
    </PageContainer>
  );
}

import { useState } from 'react';
import { Users as UsersIcon, Download, Eye, EyeOff } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAdminUsers, useSetUserHidden } from './hooks/useAdmin';
import { AdminUserDetail } from './components/AdminUserDetail';
import { adminService } from '@/services/adminService';
import { useUiStore } from '@/stores/uiStore';
import type { AdminUserListItem } from '@/types';

export function AdminUsersPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'all' | 'user' | 'admin'>('all');
  const [status, setStatus] = useState<'all' | 'ACTIVE' | 'DISABLED' | 'BANNED' | 'PENDING'>('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);
  const pushToast = useUiStore((s) => s.pushToast);
  const [isExporting, setIsExporting] = useState(false);
  const setUserHidden = useSetUserHidden();

  async function handleExport() {
    setIsExporting(true);
    try {
      await adminService.exportUsersCsv({
        search: debouncedSearch || undefined,
        role: role === 'all' ? undefined : role,
        status: status === 'all' ? undefined : status,
      });
    } catch {
      pushToast({ title: 'Export failed', variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  }

  const { data, isLoading, isError, refetch } = useAdminUsers({
    search: debouncedSearch || undefined,
    role: role === 'all' ? undefined : role,
    status: status === 'all' ? undefined : status,
    page,
    limit: 20,
  });

  if (selectedUserId) {
    return (
      <PageContainer>
        <AdminUserDetail userId={selectedUserId} onBack={() => setSelectedUserId(null)} />
      </PageContainer>
    );
  }

  const columns: DataTableColumn<AdminUserListItem>[] = [
    { key: 'username', header: 'Username', render: (u) => <span className="font-medium text-[var(--color-text-primary)]">{u.username}</span> },
    { key: 'email', header: 'Email', render: (u) => <span className="font-mono text-xs">{u.email}</span> },
    { key: 'role', header: 'Role', render: (u) => <span className="uppercase">{u.role}</span> },
    { key: 'points', header: 'Points', className: 'text-right', render: (u) => <span className="font-mono">{u.points.toLocaleString()}</span> },
    { key: 'solved', header: 'Solved', className: 'text-right', render: (u) => u.solvedCount },
    { key: 'team', header: 'Team', render: (u) => u.teamName ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <Badge
          variant={
            u.status === 'ACTIVE' ? 'success' : u.status === 'BANNED' || u.status === 'PENDING' ? 'warning' : 'error'
          }
        >
          {u.status}
        </Badge>
      ),
    },
    {
      key: 'hidden',
      header: 'Leaderboard',
      className: 'text-right',
      render: (u) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setUserHidden.mutate({ id: u.id, hidden: !u.hidden });
          }}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          aria-label={u.hidden ? `Unhide ${u.username} from the leaderboard` : `Hide ${u.username} from the leaderboard`}
          title={u.hidden ? 'Hidden from leaderboard — click to unhide' : 'Visible on leaderboard — click to hide'}
        >
          {u.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      ),
    },
  ];

  return (
    <PageContainer className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">Users</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {data?.pagination.total ?? 0} registered operators.
          </p>
        </div>
        <Button variant="outline" leftIcon={<Download className="size-4" />} isLoading={isExporting} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput
          placeholder="Search username or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search users"
          className="max-w-sm flex-1"
        />
        <Select
          aria-label="Filter by role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as typeof role);
            setPage(1);
          }}
          className="w-auto"
        >
          <option value="all">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Select>
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setPage(1);
          }}
          className="w-auto"
        >
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
          <option value="BANNED">Banned</option>
          <option value="PENDING">Pending approval</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.users ?? []}
        rowKey={(u) => u.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onRowClick={(u) => setSelectedUserId(u.id)}
        emptyIcon={UsersIcon}
        emptyTitle="No users match these filters"
      />

      {data && (
        <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
      )}
    </PageContainer>
  );
}

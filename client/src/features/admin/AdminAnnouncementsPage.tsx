import { useState } from 'react';
import { Megaphone, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { useUiStore } from '@/stores/uiStore';
import { useAdminAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from './hooks/useAdmin';
import { formatRelativeTime } from '@/lib/utils';

const PAGE_SIZE = 20;

export function AdminAnnouncementsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminAnnouncements(page, PAGE_SIZE);
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const pushToast = useUiStore((s) => s.pushToast);

  const [message, setMessage] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function handleBroadcast() {
    if (!message.trim()) return;
    createAnnouncement.mutate(message.trim(), {
      onSuccess: () => {
        pushToast({ title: 'Announcement broadcast', variant: 'success' });
        setMessage('');
      },
      onError: () => pushToast({ title: 'Could not broadcast announcement', variant: 'error' }),
    });
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
          Announcements
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Broadcasts show up in every logged-in player's notification center within about a
          minute.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-glass-border)] bg-[var(--color-surface)]/40 p-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Server maintenance in 10 minutes — save your progress."
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none"
        />
        <Button
          className="self-start"
          leftIcon={<Megaphone className="size-4" />}
          disabled={!message.trim()}
          isLoading={createAnnouncement.isPending}
          onClick={handleBroadcast}
        >
          Broadcast
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.entries.length ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-[var(--color-text-muted)]">
          <Megaphone className="size-8" />
          <p className="text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {data.entries.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">{a.message}</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{formatRelativeTime(a.createdAt)}</p>
              </div>
              <button
                onClick={() => setPendingDeleteId(a.id)}
                className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                aria-label="Retract announcement"
                title="Retract"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {data && <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />}

      <ConfirmDialog
        open={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() =>
          pendingDeleteId &&
          deleteAnnouncement.mutate(pendingDeleteId, {
            onSuccess: () => {
              pushToast({ title: 'Announcement retracted', variant: 'info' });
              setPendingDeleteId(null);
            },
          })
        }
        title="Retract this announcement?"
        description="It will no longer be shown to anyone who hasn't already seen it. This cannot be undone."
        confirmLabel="Retract"
        variant="danger"
        isLoading={deleteAnnouncement.isPending}
      />
    </PageContainer>
  );
}

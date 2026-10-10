import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Flag as FlagIcon, Pencil, Trash2, Eye, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { CATEGORY_META } from '@/lib/categories';
import { formatRelativeTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useAppAwarePath } from '@/lib/appPath';
import { useWriteup, useToggleWriteupLike, useSubmitWriteupForReview, useDeleteWriteup } from '../hooks/useWriteups';
import { ReportModal } from './ReportModal';

export function WriteupView({ slug, dense }: { slug: string; dense?: boolean }) {
  const toPath = useAppAwarePath();
  const userId = useAuthStore((s) => s.user?.id);
  const { data: writeup, isLoading } = useWriteup(slug);
  const toggleLike = useToggleWriteupLike();
  const submitForReview = useSubmitWriteupForReview();
  const deleteWriteup = useDeleteWriteup();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (isLoading) return <LoadingSpinner label="Loading writeup..." />;
  if (!writeup) {
    return <EmptyState title="Writeup not found" description="It may be unpublished, removed, or never existed." />;
  }

  const category = CATEGORY_META[writeup.category];
  const isOwner = userId === writeup.authorId;
  const isDraftOrRejected = writeup.status === 'DRAFT' || writeup.status === 'REJECTED';

  return (
    <div className={cn('flex flex-col gap-5', dense ? 'p-4' : 'p-6')}>
      {writeup.status !== 'PUBLISHED' && (
        <Badge variant={writeup.status === 'REJECTED' ? 'error' : 'warning'} className="w-fit">
          {writeup.status.replace('_', ' ')}
        </Badge>
      )}

      {writeup.rejectionReason && (
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-3 text-sm text-[var(--color-error)]">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>Not published — {writeup.rejectionReason}</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-muted)]">
            <span className="rounded-full border border-[var(--color-error)]/40 px-2 py-0.5 text-[var(--color-error)]">
              Spoiler — contains solution
            </span>
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-[var(--color-text-primary)]">{writeup.title}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            By{' '}
            <Link to={toPath(`/profile/${writeup.author}`)} className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)]">
              {writeup.author}
            </Link>{' '}
            · {category?.name ?? writeup.category} · {writeup.challengeTitle}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-y border-[var(--color-border)] py-3 text-xs text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-1">
          <Eye className="size-3.5" /> {writeup.views} views
        </span>
        <button
          type="button"
          onClick={() => toggleLike.mutate({ id: writeup.id })}
          className={cn(
            'inline-flex items-center gap-1 transition-colors',
            writeup.likedByViewer ? 'text-[var(--color-error)]' : 'hover:text-[var(--color-text-primary)]',
          )}
        >
          <Heart className={cn('size-3.5', writeup.likedByViewer && 'fill-current')} /> {writeup.likesCount}
        </button>
        {writeup.publishedAt && <span>Published {formatRelativeTime(writeup.publishedAt)}</span>}

        <div className="ml-auto flex items-center gap-2">
          {isOwner && isDraftOrRejected && (
            <>
              <Link to={toPath(`/writeups/${writeup.slug}/edit`)}>
                <Button variant="ghost" size="sm" leftIcon={<Pencil className="size-3.5" />}>
                  Edit
                </Button>
              </Link>
              <Button variant="primary" size="sm" onClick={() => submitForReview.mutate(writeup.id)} isLoading={submitForReview.isPending}>
                Submit for review
              </Button>
            </>
          )}
          {isOwner && (
            <Button variant="ghost" size="sm" leftIcon={<Trash2 className="size-3.5" />} onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          )}
          {!isOwner && userId && (
            <Button variant="ghost" size="sm" leftIcon={<FlagIcon className="size-3.5" />} onClick={() => setReportOpen(true)}>
              Report
            </Button>
          )}
        </div>
      </div>

      <MarkdownContent content={writeup.content} />

      <ReportModal writeupId={writeup.id} open={reportOpen} onClose={() => setReportOpen(false)} />
      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => deleteWriteup.mutate(writeup.id, { onSuccess: () => setConfirmingDelete(false) })}
        title="Delete this writeup?"
        description="This can't be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteWriteup.isPending}
      />
    </div>
  );
}

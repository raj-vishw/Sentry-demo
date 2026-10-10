import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { FolderOpen, Download } from 'lucide-react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { challengeService } from '@/services/challengeService';
import { challengeQueryKey } from '@/features/challenges/hooks/useChallenge';
import { useWindowStore } from '../state/windowStore';
import { cn } from '@/lib/utils';

/**
 * Real evidence browser — aggregates the file lists of whichever challenges
 * currently have a Laboratory window open. It never fabricates entries: a
 * challenge only appears here once its own detail fetch has resolved.
 */
export function FilesApp({ isCompact }: { isCompact: boolean }) {
  // Select the stable `windows` array and derive the slug list locally — a
  // selector that builds a new array every call (Array.from(new Set(...)))
  // makes the store look like it changes on every render, causing an
  // infinite render loop ("Maximum update depth exceeded").
  const windows = useWindowStore((s) => s.windows);
  const labSlugs = useMemo(
    () => Array.from(new Set(windows.filter((w) => w.appId === 'laboratory').map((w) => w.params.slug))),
    [windows],
  );

  const results = useQueries({
    queries: labSlugs.map((slug) => ({
      queryKey: challengeQueryKey(slug),
      queryFn: () => challengeService.getBySlug(slug),
      enabled: !!slug,
    })),
  });

  const groups = results
    .map((r) => r.data)
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ challenge: c, files: c.files }));

  if (groups.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FolderOpen}
          title="No evidence mounted"
          description="Open a challenge in the Laboratory to browse its files here."
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-5 overflow-y-auto p-4', isCompact ? '' : 'p-6')}>
      {groups.map(({ challenge, files }) => (
        <div key={challenge.id}>
          <p className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-muted)]">
            <FolderOpen className="size-3.5" /> {challenge.title}
          </p>
          {files.length === 0 ? (
            <p className="px-1 text-xs text-[var(--color-text-muted)]">No files.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {files.map((file) => (
                <li key={file.id}>
                  <button
                    type="button"
                    onClick={() => challengeService.downloadFile(challenge.id, file.id, file.name)}
                    className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-glass-border)] bg-[var(--color-surface)]/50 px-3.5 py-2.5 text-sm hover:border-[var(--color-accent)]/40"
                  >
                    <span className="truncate font-mono text-xs text-[var(--color-text-primary)]">{file.name}</span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[var(--color-text-muted)]">
                      {file.sizeKb.toLocaleString()} KB
                      <Download className="size-3.5" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

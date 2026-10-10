import type { RecentSolve } from '@/types';
import { CATEGORY_META } from '@/lib/categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatRelativeTime } from '@/lib/utils';
import { History } from 'lucide-react';

export function RecentSolvesList({ solves }: { solves: RecentSolve[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Solves</CardTitle>
      </CardHeader>
      <CardContent>
        {solves.length === 0 ? (
          <EmptyState icon={History} title="No solves yet" description="Solve your first challenge to see it here." />
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-border)]">
            {solves.map((solve) => {
              const Icon = CATEGORY_META[solve.category].icon;
              return (
                <li key={solve.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] text-[var(--color-accent)]">
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{solve.challengeTitle}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{formatRelativeTime(solve.solvedAt)}</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm text-[var(--color-accent)]">+{solve.points}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

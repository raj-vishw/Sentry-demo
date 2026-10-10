import { Lightbulb, Lock } from 'lucide-react';
import type { Hint } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useUnlockHint } from '../hooks/useUnlockHint';
import { useUiStore } from '@/stores/uiStore';
import { ApiError } from '@/lib/apiClient';

export function HintsList({
  challengeId,
  slug,
  hints,
}: {
  challengeId: string;
  slug: string;
  hints: Hint[];
}) {
  const unlockHint = useUnlockHint(slug);
  const pushToast = useUiStore((s) => s.pushToast);

  if (hints.length === 0) return null;

  async function handleUnlock(hintId: string) {
    try {
      await unlockHint.mutateAsync({ challengeId, hintId });
    } catch (err) {
      // A 400 here specifically means "not enough points" — worth a
      // pointed message; other failures fall back to the generic global
      // error toast already shown by the mutation cache.
      if (err instanceof ApiError && err.status === 400) {
        pushToast({ title: 'Not enough points', description: err.message, variant: 'warning' });
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {hints.map((hint) => (
        <div
          key={hint.id}
          className={cn(
            'flex items-center justify-between gap-3 rounded-[var(--radius-md)] border px-4 py-3',
            'border-[var(--color-glass-border)] bg-[var(--color-surface)]/50',
          )}
        >
          {hint.unlocked ? (
            <p className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <Lightbulb className="size-4 shrink-0 text-[var(--color-warning)]" aria-hidden="true" />
              {hint.title && <span className="font-medium text-[var(--color-text-primary)]">{hint.title}:</span>}
              {hint.content}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <Lock className="size-4 shrink-0" aria-hidden="true" />
              {hint.title ?? 'Hint'} — costs {hint.cost} XP
            </p>
          )}
          {!hint.unlocked && (
            <Button
              variant="outline"
              size="sm"
              isLoading={unlockHint.isPending && unlockHint.variables?.hintId === hint.id}
              onClick={() => handleUnlock(hint.id)}
            >
              Unlock
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

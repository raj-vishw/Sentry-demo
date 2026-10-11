import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSubmitFlag } from '../hooks/useSubmitFlag';
import { useUiStore } from '@/stores/uiStore';
import { getAchievementMeta } from '@/lib/achievements';
import type { ConsoleEntry } from './SubmissionConsole';

const flagSchema = z.object({
  flag: z.string().min(1, 'Enter a flag before submitting.'),
});

type FlagFormValues = z.infer<typeof flagSchema>;

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function FlagSubmitForm({
  challengeId,
  slug,
  solved,
  onSolved,
  onLog,
}: {
  challengeId: string;
  slug: string;
  solved: boolean;
  onSolved: (pointsAwarded: number) => void;
  onLog: (entry: ConsoleEntry) => void;
}) {
  const submitFlag = useSubmitFlag(slug);
  const pushToast = useUiStore((s) => s.pushToast);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: isValidating },
  } = useForm<FlagFormValues>({ resolver: zodResolver(flagSchema) });

  async function onSubmit(values: FlagFormValues) {
    onLog({ id: crypto.randomUUID(), time: nowLabel(), message: `> submit ${values.flag}`, tone: 'info' });
    onLog({
      id: crypto.randomUUID(),
      time: nowLabel(),
      message: `validating against ./${slug}...`,
      tone: 'info',
    });
    try {
      const response = await submitFlag.mutateAsync({ challengeId, flag: values.flag });
      if (!response.correct) {
        onLog({ id: crypto.randomUUID(), time: nowLabel(), message: '✗ incorrect flag.', tone: 'error' });
        return;
      }
      if (response.alreadySolved) {
        onLog({
          id: crypto.randomUUID(),
          time: nowLabel(),
          message: 'already solved — no additional points.',
          tone: 'info',
        });
        return;
      }
      const firstBlood = response.newAchievements.some((a) => a.type === 'FIRST_BLOOD');
      onLog({
        id: crypto.randomUUID(),
        time: nowLabel(),
        message: `✓ correct — +${response.pointsAwarded} xp${firstBlood ? ' — first blood' : ''}`,
        tone: 'success',
      });
      for (const achievement of response.newAchievements) {
        const meta = getAchievementMeta(achievement.type);
        pushToast({ title: `Achievement unlocked: ${meta.label}`, description: meta.description, variant: 'success' });
      }
      reset();
      onSolved(response.pointsAwarded);
    } catch {
      onLog({
        id: crypto.randomUUID(),
        time: nowLabel(),
        message: 'Submission failed — see notification.',
        tone: 'error',
      });
    }
  }

  if (solved) {
    return (
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-4 py-3 text-sm text-[var(--color-success)]">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        You've already solved this challenge.
      </div>
    );
  }

  const isSubmitting = isValidating || submitFlag.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-2">
      <div className="flex items-center gap-2 border border-[var(--color-border-strong)] bg-[var(--color-bg)]/60 px-3.5 py-3 focus-within:border-[var(--color-accent)]">
        <span className="shrink-0 font-mono text-sm text-[var(--color-accent)]" aria-hidden="true">
          &gt;
        </span>
        <input
          aria-label="Flag"
          placeholder="enter flag..."
          className="w-full bg-transparent font-mono text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          {...register('flag')}
        />
        <span
          aria-hidden="true"
          className="h-[15px] w-[7px] shrink-0 animate-pulse-slow bg-[var(--color-accent)]"
        />
        <Button type="submit" size="sm" variant="outline" isLoading={isSubmitting} className="shrink-0">
          <span aria-hidden="true">[</span>&nbsp;run&nbsp;<span aria-hidden="true">]</span>
        </Button>
      </div>
      {errors.flag && <p className="text-xs text-[var(--color-error)]">{errors.flag.message}</p>}
    </form>
  );
}

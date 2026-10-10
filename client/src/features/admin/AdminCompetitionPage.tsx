import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useUiStore } from '@/stores/uiStore';
import { useCompetitionSettings, useUpdateCompetitionSettings } from './hooks/useAdmin';
import type { LeaderboardVisibility } from '@/types';

/** Local datetime-local input value (no timezone, minute precision), or ''. */
function toInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminCompetitionPage() {
  const { data: config, isLoading, isError, refetch } = useCompetitionSettings();
  const updateCompetition = useUpdateCompetitionSettings();
  const pushToast = useUiStore((s) => s.pushToast);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [freezeTime, setFreezeTime] = useState('');

  useEffect(() => {
    if (config) {
      setName(config.name);
      setDescription(config.description);
      setRules(config.rules);
      setStartTime(toInputValue(config.startTime));
      setEndTime(toInputValue(config.endTime));
      setFreezeTime(toInputValue(config.freezeTime));
    }
  }, [config]);

  if (isLoading) return <LoadingSpinner label="Loading competition settings..." />;
  if (isError || !config) return <ErrorState onRetry={() => refetch()} />;

  const detailsDirty =
    name !== config.name ||
    description !== config.description ||
    rules !== config.rules ||
    startTime !== toInputValue(config.startTime) ||
    endTime !== toInputValue(config.endTime);

  function saveDetails() {
    updateCompetition.mutate(
      {
        name,
        description,
        rules,
        startTime: startTime ? new Date(startTime).toISOString() : null,
        endTime: endTime ? new Date(endTime).toISOString() : null,
      },
      {
        onSuccess: () => pushToast({ title: 'Competition details updated', variant: 'success' }),
        onError: () => pushToast({ title: 'Could not save competition details', variant: 'error' }),
      },
    );
  }

  const freezeDirty = freezeTime !== toInputValue(config.freezeTime);

  function saveFreezeTime() {
    updateCompetition.mutate(
      { freezeTime: freezeTime ? new Date(freezeTime).toISOString() : null },
      {
        onSuccess: () =>
          pushToast({ title: freezeTime ? 'Freeze time set' : 'Freeze time cleared', variant: 'success' }),
        onError: () => pushToast({ title: 'Could not save freeze time', variant: 'error' }),
      },
    );
  }

  function setLeaderboardVisibility(visibility: LeaderboardVisibility) {
    updateCompetition.mutate(
      { leaderboardVisibility: visibility },
      {
        onSuccess: () =>
          pushToast({
            title: visibility === 'hidden' ? 'Leaderboard hidden from players' : 'Leaderboard visible to players',
            variant: 'info',
          }),
        onError: () => pushToast({ title: 'Could not update leaderboard visibility', variant: 'error' }),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
          Competition
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          The event currently running on this deployment — separate from the platform-wide
          settings in Settings, so you can reconfigure one without touching the other.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input label="Competition name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
              Rules (Markdown)
            </label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              maxLength={10_000}
              rows={6}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start time (display only)"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              label="End time (display only)"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            These dates are shown to players but don't currently block submissions outside the
            window — see docs/customization.md.
          </p>
          <Button className="self-start" disabled={!detailsDirty} isLoading={updateCompetition.isPending} onClick={saveDetails}>
            Save details
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-glass-border)] bg-[var(--color-surface)]/40 px-3.5 py-3">
            <div>
              <p className="text-sm text-[var(--color-text-primary)]">Visibility</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Hidden means every non-admin — logged in or not — sees a placeholder instead of
                standings. Admins always see the real leaderboard.
              </p>
            </div>
            <Select
              aria-label="Leaderboard visibility"
              value={config.leaderboardVisibility}
              onChange={(e) => setLeaderboardVisibility(e.target.value as LeaderboardVisibility)}
              className="w-auto shrink-0"
            >
              <option value="public">Public</option>
              <option value="hidden">Hidden</option>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-glass-border)] bg-[var(--color-surface)]/40 px-3.5 py-3">
            <div>
              <p className="text-sm text-[var(--color-text-primary)]">Freeze time</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Once this passes, non-admins see standings frozen at this instant. Scoring never
                stops — solves still count, they just stop moving the displayed board. Leave blank
                to never freeze.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Input
                aria-label="Freeze time"
                type="datetime-local"
                value={freezeTime}
                onChange={(e) => setFreezeTime(e.target.value)}
                className="w-auto"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!freezeDirty}
                isLoading={updateCompetition.isPending}
                onClick={saveFreezeTime}
              >
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  FileX,
  FileText,
  Flame,
  Lightbulb,
  Lock,
  NotebookPen,
  Server,
  Target,
  Terminal,
  TriangleAlert,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ObservatoryLoader } from '@/components/feedback/ObservatoryLoader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { FlagSubmitForm } from './FlagSubmitForm';
import { HintsList } from './HintsList';
import { Notes } from './Notes';
import { LabPanel } from './LabPanel';
import { SubmissionConsole, type ConsoleEntry } from './SubmissionConsole';
import { DiscoveryOverlay } from './DiscoveryOverlay';
import { challengeService } from '@/services/challengeService';
import { useChallenge } from '../hooks/useChallenge';
import { CATEGORY_META, DIFFICULTY_META } from '@/lib/categories';
import { useAppAwarePath } from '@/lib/appPath';
import { useNotificationStore } from '@/os/state/notificationStore';
import type { ChallengeInstance, PublicEnvironment } from '@/types';

/**
 * The only runtime behind this today (NotImplementedRuntime, server-side)
 * never actually starts anything — it always reports back FAILED with a
 * clear reason. This panel reflects that honestly instead of faking a
 * working console; see docs/challenges/interactive-challenges.md.
 */
function EnvironmentPanel({ challengeId, environment }: { challengeId: string; environment: PublicEnvironment }) {
  const [instance, setInstance] = useState<ChallengeInstance | null>(null);
  const [launching, setLaunching] = useState(false);

  async function launch() {
    setLaunching(true);
    try {
      setInstance(await challengeService.createInstance(challengeId));
    } catch {
      // The request itself failing (network/auth) is distinct from the
      // runtime reporting FAILED — either way there's nothing to show.
    } finally {
      setLaunching(false);
    }
  }

  return (
    <LabPanel id="environment" title="Environment" icon={Server}>
      <div className="flex flex-col gap-3">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-[var(--color-text-muted)]">Protocol</dt>
          <dd className="text-right font-mono text-[var(--color-text-primary)]">{environment.protocol}</dd>
          <dt className="text-[var(--color-text-muted)]">Port</dt>
          <dd className="text-right font-mono text-[var(--color-text-primary)]">{environment.port ?? '—'}</dd>
        </dl>

        {!instance ? (
          <Button variant="outline" size="sm" isLoading={launching} onClick={launch}>
            Launch instance
          </Button>
        ) : instance.status === 'FAILED' ? (
          <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-2.5 text-sm text-[var(--color-warning)]">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{instance.failureReason ?? 'This instance could not be started.'}</span>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">Status: {instance.status}</p>
        )}
      </div>
    </LabPanel>
  );
}

/**
 * The "Glass Laboratory" — the entire single-challenge investigation
 * workspace, keyed purely off a slug. Used both by the standalone public
 * route (ChallengeDetailPage) and by the OS Laboratory app window, so the
 * two never drift out of sync.
 */
export function ChallengeWorkspace({ slug, dense = false }: { slug: string; dense?: boolean }) {
  const toPath = useAppAwarePath();
  const { data: challenge, isLoading, isError, refetch } = useChallenge(slug);
  const [log, setLog] = useState<ConsoleEntry[]>([]);
  const [discovery, setDiscovery] = useState<{ points: number } | null>(null);
  const pushNotification = useNotificationStore((s) => s.push);

  if (isLoading) {
    return <ObservatoryLoader label="Loading investigation" />;
  }

  if (isError || !challenge) {
    return (
      <ErrorState title="Challenge not found" description="This challenge may have been removed." onRetry={() => refetch()} />
    );
  }

  const category = CATEGORY_META[challenge.category];
  const difficulty = DIFFICULTY_META[challenge.difficulty];
  const CategoryIcon = category.icon;

  if (challenge.locked) {
    return (
      <GlassPanel strength="strong" className="flex flex-col items-center gap-4 p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-[var(--color-surface-elevated)]">
          <Lock className="size-6 text-[var(--color-text-muted)]" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="accent">
            <CategoryIcon className="size-3.5" /> {category.name}
          </Badge>
          <Badge style={{ color: difficulty.color }}>{difficulty.label}</Badge>
        </div>
        <h1 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">{challenge.title}</h1>
        <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
          This challenge is locked.
          {challenge.unlockRequirement && (
            <>
              {' '}
              Solve{' '}
              <Link
                to={toPath(`/challenges/${challenge.unlockRequirement.slug}`)}
                className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
              >
                {challenge.unlockRequirement.title}
              </Link>{' '}
              first to unlock it.
            </>
          )}
        </p>
        {challenge.unlockRequirement && (
          <Link to={toPath(`/challenges/${challenge.unlockRequirement.slug}`)}>
            <Button variant="outline">Go to {challenge.unlockRequirement.title}</Button>
          </Link>
        )}
      </GlassPanel>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="accent">
            <CategoryIcon className="size-3.5" /> {category.name}
          </Badge>
          <Badge style={{ color: difficulty.color }}>{difficulty.label}</Badge>
        </div>
      </div>

      {/* Investigation | Target | Workspace — the Glass Laboratory */}
      <div className={dense ? 'flex flex-col gap-4' : 'grid grid-cols-1 gap-4 @lg:grid-cols-[280px_1fr_280px] @lg:items-start'}>
        <div className="flex flex-col gap-4 @lg:order-1">
          <LabPanel id="objective" title="Objective" icon={Target}>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{challenge.description}</p>
          </LabPanel>

          <LabPanel id="evidence" title="Evidence" icon={FileText}>
            {challenge.files.length === 0 ? (
              <EmptyState icon={FileX} title="No files for this challenge" />
            ) : (
              <ul className="flex flex-col gap-2">
                {challenge.files.map((file) => (
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
          </LabPanel>

          {challenge.environment && <EnvironmentPanel challengeId={challenge.id} environment={challenge.environment} />}

          {challenge.hints.length > 0 && (
            <LabPanel id="hints" title="Hints" icon={Lightbulb}>
              <HintsList challengeId={challenge.id} slug={slug} hints={challenge.hints} />
            </LabPanel>
          )}

          <LabPanel id="notes" title="Notes" icon={NotebookPen} defaultOpen={false}>
            <Notes challengeId={challenge.id} />
          </LabPanel>
        </div>

        <div className="@lg:order-2">
          <GlassPanel strength="strong" className="flex flex-col gap-6 p-6 sm:p-8">
            <div>
              <h1 className="text-balance font-display text-2xl font-semibold text-[var(--color-text-primary)] sm:text-3xl">
                {challenge.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                <span className="inline-flex items-center gap-1 font-mono text-[var(--color-accent)]">
                  <Zap className="size-4" /> {challenge.points} XP
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-4" /> {challenge.solveCount} solves
                </span>
                <span className="inline-flex items-center gap-1">
                  <User className="size-4" /> {challenge.author}
                </span>
                {challenge.firstBlood && (
                  <span className="inline-flex items-center gap-1 text-[var(--color-error)]">
                    <Flame className="size-4" /> First blood: {challenge.firstBlood.username}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-glass-border-strong)] bg-[var(--color-bg)]/40 p-6 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
                Lab System
              </p>
              <p className="mt-2 font-mono text-sm text-[var(--color-text-secondary)]">
                Flag format: <span className="text-[var(--color-accent)]">CTF{'{...}'}</span>
              </p>
            </div>

            <FlagSubmitForm
              challengeId={challenge.id}
              slug={slug}
              solved={challenge.solved}
              onLog={(entry) => setLog((prev) => [entry, ...prev])}
              onSolved={(points) => {
                setDiscovery({ points });
                pushNotification({
                  category: 'security',
                  title: 'Objective complete',
                  message: `${challenge.title} solved — +${points} XP awarded.`,
                });
              }}
            />
          </GlassPanel>
        </div>

        <div className="@lg:order-3">
          <LabPanel id="console" title="Console" icon={Terminal}>
            <SubmissionConsole entries={log} />
          </LabPanel>
        </div>
      </div>

      {discovery && (
        <DiscoveryOverlay
          open
          onClose={() => setDiscovery(null)}
          challenge={challenge}
          pointsAwarded={discovery.points}
        />
      )}
    </div>
  );
}

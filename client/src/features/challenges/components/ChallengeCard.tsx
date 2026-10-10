import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, CheckCircle2, Lock } from 'lucide-react';
import type { Challenge, Difficulty } from '@/types';
import { CATEGORY_META, DIFFICULTY_META } from '@/lib/categories';
import { useAppAwarePath } from '@/lib/appPath';
import { cn } from '@/lib/utils';

const DIFFICULTY_DOTS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, insane: 4 };

function DifficultyDots({ difficulty }: { difficulty: Difficulty }) {
  const filled = DIFFICULTY_DOTS[difficulty];
  const color = DIFFICULTY_META[difficulty].color;
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          className="size-1.5 rounded-full"
          style={{ backgroundColor: i < filled ? color : 'var(--color-glass-border-strong)' }}
        />
      ))}
    </span>
  );
}

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const toPath = useAppAwarePath();
  const category = CATEGORY_META[challenge.category];
  const difficulty = DIFFICULTY_META[challenge.difficulty];
  const Icon = category.icon;

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="h-full">
      <Link
        to={toPath(`/challenges/${challenge.slug}`)}
        className={cn(
          'group glass-panel relative flex h-full flex-col gap-4 overflow-hidden rounded-[var(--radius-lg)] p-5',
          'transition-[border-color,box-shadow] duration-[var(--duration-base)]',
          'hover:border-[var(--color-accent)]/40 hover:shadow-[var(--shadow-glow-accent)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
          challenge.locked && 'opacity-60 saturate-50',
        )}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)' }}
        />

        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-muted)]">
            <span className="flex size-6 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-accent)]">
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            {category.name}
          </span>
          {challenge.locked ? (
            <Lock className="size-4 text-[var(--color-text-muted)]" aria-label="Locked" />
          ) : (
            challenge.solved && <CheckCircle2 className="size-5 text-[var(--color-success)]" aria-label="Solved" />
          )}
        </div>

        <div>
          <h3 className="font-display text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
            {challenge.title}
          </h3>
          <div className="mt-2 flex items-center gap-2">
            <DifficultyDots difficulty={challenge.difficulty} />
            <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: difficulty.color }}>
              {difficulty.label}
            </span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-[var(--color-glass-border)] pt-3 text-xs text-[var(--color-text-muted)]">
          <span className="font-mono font-medium text-[var(--color-accent)]">{challenge.points} XP</span>
          <span className="inline-flex items-center gap-1 text-[var(--color-text-muted)] transition-colors group-hover:text-[var(--color-text-secondary)]">
            {challenge.solveCount} solves
            <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

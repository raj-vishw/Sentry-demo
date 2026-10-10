import { Users, Zap } from 'lucide-react';
import type { TeamSummary } from '@/types';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { formatNumber } from '@/lib/utils';

export function TeamCard({ team }: { team: TeamSummary }) {
  return (
    <GlassPanel className="flex flex-col gap-3 p-5">
      <div>
        <h3 className="font-display text-base font-semibold text-[var(--color-text-primary)]">{team.name}</h3>
        {team.description && (
          <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-secondary)]">{team.description}</p>
        )}
      </div>

      <div className="mt-auto flex items-center gap-4 border-t border-[var(--color-glass-border)] pt-3 text-xs text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-1.5 font-mono text-[var(--color-accent)]">
          <Zap className="size-3.5" /> {formatNumber(team.xp)} XP
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" /> {team.memberCount} member{team.memberCount === 1 ? '' : 's'}
        </span>
      </div>
    </GlassPanel>
  );
}

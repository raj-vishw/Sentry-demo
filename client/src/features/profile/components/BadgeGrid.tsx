import { Award } from 'lucide-react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { getAchievementMeta } from '@/lib/achievements';
import type { Achievement } from '@/types';

/** Shared between the owner's own profile and any public `/profile/:username`
 * view — the same badge catalog applies to both. */
export function BadgeGrid({ badges }: { badges: Achievement[] }) {
  if (badges.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="No badges yet"
        description="Solve challenges, publish writeups, and found a team to start earning them."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 @sm:grid-cols-3 @lg:grid-cols-4">
      {badges.map((badge) => {
        const meta = getAchievementMeta(badge.type);
        const Icon = meta.icon;
        return (
          <div
            key={badge.type}
            title={meta.description}
            className="glass-panel flex flex-col items-center gap-2 rounded-[var(--radius-lg)] p-4 text-center"
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-medium text-[var(--color-text-primary)]">{meta.label}</p>
          </div>
        );
      })}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Heart, ArrowUpRight } from 'lucide-react';
import type { WriteupListItem } from '@/types';
import { CATEGORY_META } from '@/lib/categories';
import { useAppAwarePath } from '@/lib/appPath';
import { cn } from '@/lib/utils';

/**
 * Used by `WriteupsPage`, which is itself shared between the public
 * `/writeups` route and the OS `/app/writeups` window — this card has to
 * know which context it's in, or an authenticated viewer clicking a card
 * inside their OS would get bounced out to the public page instead of
 * opening the OS writeup window.
 */
export function WriteupCard({ writeup }: { writeup: WriteupListItem }) {
  const toPath = useAppAwarePath();
  const category = CATEGORY_META[writeup.category];
  const Icon = category?.icon;

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="h-full">
      <Link
        to={toPath(`/writeups/${writeup.slug}`)}
        className={cn(
          'group glass-panel relative flex h-full flex-col gap-4 overflow-hidden rounded-[var(--radius-lg)] p-5',
          'transition-[border-color,box-shadow] duration-[var(--duration-base)]',
          'hover:border-[var(--color-accent)]/40 hover:shadow-[var(--shadow-glow-accent)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
        )}
      >
        <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-muted)]">
          {Icon && (
            <span className="flex size-6 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-accent)]">
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
          )}
          {category?.name ?? writeup.category}
        </div>

        <div>
          <h3 className="font-display text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
            {writeup.title}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {writeup.challengeTitle} · by {writeup.author}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-[var(--color-glass-border)] pt-3 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3.5" /> {writeup.views}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3.5" /> {writeup.likesCount}
            </span>
          </span>
          <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
        </div>
      </Link>
    </motion.div>
  );
}

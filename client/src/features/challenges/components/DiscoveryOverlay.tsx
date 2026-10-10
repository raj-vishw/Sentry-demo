import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Challenge } from '@/types';
import { CATEGORY_META } from '@/lib/categories';
import { useAppBasePath } from '@/lib/appPath';
import { Button } from '@/components/ui/Button';

/**
 * Replaces a plain "Challenge Completed!" toast with a proper event: the
 * solved challenge becomes a discovered node, its category lights up, and
 * the player is pointed toward what's next — per the "discovery, not a
 * form submission" completion design.
 */
export function DiscoveryOverlay({
  open,
  onClose,
  challenge,
  pointsAwarded,
}: {
  open: boolean;
  onClose: () => void;
  challenge: Challenge;
  pointsAwarded: number;
}) {
  const category = CATEGORY_META[challenge.category];
  const Icon = category.icon;
  const appBasePath = useAppBasePath();

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[650] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[var(--color-bg)]/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Challenge discovered"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            className="glass-panel-strong relative w-full max-w-sm overflow-hidden rounded-[var(--radius-xl)] p-8 text-center"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <X className="size-4" />
            </button>

            {/* A small node graph: this challenge's node lighting up and
                sending a pulse outward through its category connection. */}
            <svg viewBox="0 0 200 100" className="mx-auto h-20 w-full">
              <line x1={100} y1={50} x2={40} y2={20} stroke="var(--color-glass-border-strong)" strokeWidth={1} />
              <line x1={100} y1={50} x2={40} y2={80} stroke="var(--color-glass-border-strong)" strokeWidth={1} />
              <line x1={100} y1={50} x2={160} y2={50} stroke="var(--color-accent)" strokeWidth={1.5} />
              <circle cx={40} cy={20} r={4} fill="var(--color-glass-border-strong)" />
              <circle cx={40} cy={80} r={4} fill="var(--color-glass-border-strong)" />
              <motion.circle
                cx={160}
                cy={50}
                r={5}
                fill="var(--color-accent)"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 1, 0.6] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <motion.circle
                cx={100}
                cy={50}
                r={9}
                fill="var(--color-accent-soft)"
                stroke="var(--color-accent)"
                strokeWidth={2}
                initial={{ scale: 0.6 }}
                animate={{ scale: [0.6, 1.15, 1] }}
                transition={{ duration: 0.6 }}
              />
            </svg>

            <p className="mt-4 font-mono text-xs uppercase tracking-widest text-[var(--color-accent)]">
              Discovered
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-[var(--color-text-primary)]">
              {challenge.title}
            </h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
              <Icon className="size-3.5" /> {category.name}
            </p>

            <p className="mt-4 font-mono text-2xl font-semibold text-[var(--color-accent)]">+{pointsAwarded} XP</p>

            <div className="mt-6 flex flex-col gap-2">
              <Link to={`${appBasePath}/dashboard`} onClick={onClose}>
                <Button variant="primary" className="w-full">
                  View your observatory
                </Button>
              </Link>
              <Button variant="ghost" className="w-full" onClick={onClose}>
                Keep investigating
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

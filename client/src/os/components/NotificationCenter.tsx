import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ShieldAlert, FlaskConical, Cpu, Megaphone } from 'lucide-react';
import { useNotificationStore } from '../state/notificationStore';
import { formatRelativeTime } from '@/lib/utils';
import { EmptyState } from '@/components/feedback/EmptyState';

const CATEGORY_ICON = { system: Cpu, laboratory: FlaskConical, security: ShieldAlert, announcement: Megaphone } as const;

export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notifications = useNotificationStore((s) => s.notifications);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[540]" onClick={onClose} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel-strong fixed right-4 top-14 z-[550] flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-[var(--radius-lg)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-glass-border)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Notifications</p>
              {notifications.length > 0 && (
                <button type="button" onClick={markAllRead} className="text-xs text-[var(--color-accent)] hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {notifications.length === 0 ? (
                <EmptyState icon={Bell} title="All quiet" description="Nothing to report yet." />
              ) : (
                notifications.map((n) => {
                  const Icon = CATEGORY_ICON[n.category];
                  return (
                    <div key={n.id} className="flex gap-3 rounded-[var(--radius-md)] px-2.5 py-2.5 hover:bg-[var(--color-surface-hover)]">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-accent)]">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
                          {n.category} {!n.read && <span className="size-1.5 rounded-full bg-[var(--color-accent)]" />}
                        </p>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{n.title}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{n.message}</p>
                        <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                          {formatRelativeTime(new Date(n.time).toISOString())}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

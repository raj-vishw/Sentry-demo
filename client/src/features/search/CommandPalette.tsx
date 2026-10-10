import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Flag, LayoutGrid, LayoutTemplate, CornerDownLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { challengeService } from '@/services/challengeService';
import { CATEGORY_LIST, DIFFICULTY_META } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useAppBasePath } from '@/lib/appPath';
import { useWindowStore } from '@/os/state/windowStore';
import { listApps } from '@/os/apps/registry';

interface ResultItem {
  id: string;
  group: 'Challenges' | 'Concepts' | 'Applications';
  label: string;
  sublabel: string;
  onSelect: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const appBasePath = useAppBasePath();
  const openApp = useWindowStore((s) => s.openApp);

  // Backend-driven search (not a client-side filter over a pre-fetched
  // list) — debounced so the palette doesn't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);

  const { data: challengeResult } = useQuery({
    queryKey: ['challenges', 'palette-search', debouncedQuery],
    queryFn: () => challengeService.list({ search: debouncedQuery || undefined, limit: 6 }),
    enabled: open,
  });
  const challenges = challengeResult?.challenges;

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Autofocus once the entrance animation has started mounting.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo<ResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    // Mounted globally, even for logged-out visitors — an authenticated
    // visitor jumps into the OS window (/app/...), an unauthenticated one
    // goes to the equivalent public browsing page (same path, no prefix).
    const challengesBase = isAuthenticated ? `${appBasePath}/challenges` : '/challenges';

    const categoryResults: ResultItem[] = CATEGORY_LIST.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    ).map((c) => ({
      id: `cat-${c.id}`,
      group: 'Concepts',
      label: c.name,
      sublabel: c.description,
      onSelect: () => navigate(`${challengesBase}?category=${c.id}`),
    }));

    // Already backend-filtered by debouncedQuery — no client-side re-filter.
    const challengeResults: ResultItem[] = (challenges ?? [])
      .map((c) => ({
        id: `chal-${c.id}`,
        group: 'Challenges',
        label: c.title,
        sublabel: `${c.category} · ${DIFFICULTY_META[c.difficulty].label}`,
        onSelect: () => navigate(`${challengesBase}/${c.slug}`),
      }));

    const appResults: ResultItem[] = isAuthenticated
      ? listApps({ isAdmin: role === 'admin' })
          .filter((a) => !q || a.title.toLowerCase().includes(q))
          .map((a) => ({
            id: `app-${a.id}`,
            group: 'Applications',
            label: a.title,
            sublabel: a.routePattern ? 'Application' : 'Utility',
            onSelect: () =>
              a.routePattern && a.buildPath ? navigate(a.buildPath({})) : openApp(a.id),
          }))
      : [];

    return [...challengeResults.slice(0, 6), ...categoryResults.slice(0, 6), ...appResults.slice(0, 8)];
  }, [query, challenges, navigate, isAuthenticated, role, openApp, appBasePath]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function select(item: ResultItem) {
    item.onSelect();
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) select(item);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  const grouped = useMemo(() => {
    const groups: Record<string, ResultItem[]> = {};
    results.forEach((r) => {
      groups[r.group] = groups[r.group] ?? [];
      groups[r.group].push(r);
    });
    return groups;
  }, [results]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[600] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-[var(--color-bg)]/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel-strong relative w-full max-w-xl overflow-hidden rounded-[var(--radius-xl)]"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-[var(--color-glass-border)] px-4 py-3.5">
              <Search className="size-4 shrink-0 text-[var(--color-text-muted)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search challenges, concepts, applications..."
                className="w-full bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                aria-autocomplete="list"
              />
              <kbd className="hidden shrink-0 rounded border border-[var(--color-glass-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)] sm:block">
                ESC
              </kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  No matches in this region of the observatory.
                </p>
              )}

              {(['Challenges', 'Concepts', 'Applications'] as const).map((group) => {
                const items = grouped[group];
                if (!items || items.length === 0) return null;
                return (
                  <div key={group} className="mb-2 last:mb-0">
                    <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
                      {group}
                    </p>
                    {items.map((item) => {
                      const globalIndex = results.indexOf(item);
                      const isActive = globalIndex === activeIndex;
                      return (
                        <button
                          key={item.id}
                          onMouseEnter={() => setActiveIndex(globalIndex)}
                          onClick={() => select(item)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left transition-colors',
                            isActive ? 'bg-[var(--color-surface-elevated)]' : 'hover:bg-[var(--color-surface-hover)]',
                          )}
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-accent)]">
                            {group === 'Challenges' ? (
                              <Flag className="size-3.5" />
                            ) : group === 'Applications' ? (
                              <LayoutTemplate className="size-3.5" />
                            ) : (
                              <LayoutGrid className="size-3.5" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-[var(--color-text-primary)]">
                              {item.label}
                            </span>
                            <span className="block truncate text-xs text-[var(--color-text-muted)]">
                              {item.sublabel}
                            </span>
                          </span>
                          {isActive && <CornerDownLeft className="size-3.5 shrink-0 text-[var(--color-text-muted)]" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

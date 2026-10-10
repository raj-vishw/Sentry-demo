import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Menu, Search, X } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useDocsNav, useDoc } from './hooks/useDocs';
import { cn } from '@/lib/utils';
import type { DocNavGroup } from '@/services/docsService';

function Sidebar({ groups, activeSlug, filter, onFilterChange }: {
  groups: DocNavGroup[];
  activeSlug?: string;
  filter: string;
  onFilterChange: (v: string) => void;
}) {
  const q = filter.trim().toLowerCase();
  const filtered = q
    ? groups
        .map((g) => ({ ...g, items: g.items.filter((i) => i.title.toLowerCase().includes(q)) }))
        .filter((g) => g.items.length > 0)
    : groups;

  return (
    <nav className="flex flex-col gap-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filter docs..."
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-8 pr-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none"
        />
      </div>

      {filtered.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-2 font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-muted)]">
            {group.label}
          </p>
          {group.items.map((item) => (
            <Link
              key={item.slug}
              to={`/docs/${item.slug}`}
              className={cn(
                'rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm transition-colors',
                item.slug === activeSlug
                  ? 'bg-[var(--color-surface-elevated)] font-medium text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]',
              )}
            >
              {item.title}
            </Link>
          ))}
        </div>
      ))}

      {filtered.length === 0 && <p className="px-2 text-sm text-[var(--color-text-muted)]">No matching pages.</p>}
    </nav>
  );
}

export function DocsPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { data: groups, isLoading: navLoading } = useDocsNav();
  const [filter, setFilter] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // No slug (`/docs` itself) -> the first page in the nav tree, so the
  // route always has something to show without a separate index page.
  const resolvedSlug = slug ?? groups?.[0]?.items[0]?.slug;
  const { data: doc, isLoading: docLoading } = useDoc(resolvedSlug);
  useDocumentTitle(doc?.title ?? 'Documentation');

  const flatItems = useMemo(() => (groups ?? []).flatMap((g) => g.items), [groups]);
  const activeIndex = flatItems.findIndex((i) => i.slug === resolvedSlug);
  const prev = activeIndex > 0 ? flatItems[activeIndex - 1] : null;
  const next = activeIndex >= 0 && activeIndex < flatItems.length - 1 ? flatItems[activeIndex + 1] : null;
  const activeGroup = groups?.find((g) => g.items.some((i) => i.slug === resolvedSlug));

  return (
    <PageContainer className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <button
        type="button"
        onClick={() => setMobileNavOpen((o) => !o)}
        className="flex items-center gap-2 self-start rounded-full border border-[var(--color-glass-border)] px-3.5 py-1.5 text-sm text-[var(--color-text-secondary)] lg:hidden"
      >
        {mobileNavOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        {mobileNavOpen ? 'Close navigation' : 'Browse docs'}
      </button>

      <aside className={cn('shrink-0 lg:block lg:w-64', mobileNavOpen ? 'block' : 'hidden')}>
        {navLoading ? <LoadingSpinner /> : <Sidebar groups={groups ?? []} activeSlug={resolvedSlug} filter={filter} onFilterChange={setFilter} />}
      </aside>

      <div className="min-w-0 flex-1">
        {docLoading ? (
          <LoadingSpinner label="Loading..." />
        ) : !doc ? (
          <EmptyState title="Page not found" description="This documentation page may have moved or been removed." />
        ) : (
          <article>
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent)]">
              Docs{activeGroup ? ` / ${activeGroup.label}` : ''}
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
              {doc.title}
            </h1>
            <div className="glass-panel mt-6 rounded-[var(--radius-lg)] p-6 sm:p-8">
              <MarkdownContent content={doc.content} />
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--color-border)] pt-6">
              {prev ? (
                <Link
                  to={`/docs/${prev.slug}`}
                  className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
                >
                  <ChevronLeft className="size-4" /> {prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  to={`/docs/${next.slug}`}
                  className="flex items-center gap-1.5 text-right text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
                >
                  {next.title} <ChevronRight className="size-4" />
                </Link>
              )}
            </div>
          </article>
        )}
      </div>
    </PageContainer>
  );
}

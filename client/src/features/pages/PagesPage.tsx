import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Menu, Search, X } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePagesNav, usePage } from './hooks/usePages';
import { cn } from '@/lib/utils';
import type { PageListItem } from '@/services/pageService';

function Sidebar({ items, activeSlug, filter, onFilterChange }: {
  items: PageListItem[];
  activeSlug?: string;
  filter: string;
  onFilterChange: (v: string) => void;
}) {
  const q = filter.trim().toLowerCase();
  const filtered = q ? items.filter((i) => i.title.toLowerCase().includes(q)) : items;

  return (
    <nav className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filter pages..."
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-8 pr-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        {filtered.map((item) => (
          <Link
            key={item.slug}
            to={`/pages/${item.slug}`}
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

      {filtered.length === 0 && <p className="px-2 text-sm text-[var(--color-text-muted)]">No matching pages.</p>}
    </nav>
  );
}

export function PagesPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { data: items, isLoading: navLoading } = usePagesNav();
  const [filter, setFilter] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const resolvedSlug = slug ?? items?.[0]?.slug;
  const { data: page, isLoading: pageLoading } = usePage(resolvedSlug);
  useDocumentTitle(page?.title ?? 'Pages');

  return (
    <PageContainer className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <button
        type="button"
        onClick={() => setMobileNavOpen((o) => !o)}
        className="flex items-center gap-2 self-start rounded-full border border-[var(--color-glass-border)] px-3.5 py-1.5 text-sm text-[var(--color-text-secondary)] lg:hidden"
      >
        {mobileNavOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        {mobileNavOpen ? 'Close navigation' : 'Browse pages'}
      </button>

      <aside className={cn('shrink-0 lg:block lg:w-64', mobileNavOpen ? 'block' : 'hidden')}>
        {navLoading ? <LoadingSpinner /> : <Sidebar items={items ?? []} activeSlug={resolvedSlug} filter={filter} onFilterChange={setFilter} />}
      </aside>

      <div className="min-w-0 flex-1">
        {pageLoading ? (
          <LoadingSpinner label="Loading..." />
        ) : !page ? (
          <EmptyState title="Page not found" description="This page may have moved or been removed." />
        ) : (
          <article>
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent)]">Pages</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
              {page.title}
            </h1>
            <div className="glass-panel mt-6 rounded-[var(--radius-lg)] p-6 sm:p-8">
              <MarkdownContent content={page.content} />
            </div>
          </article>
        )}
      </div>
    </PageContainer>
  );
}

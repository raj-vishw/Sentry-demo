import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ChallengeFilters, type ChallengeFilterState } from './components/ChallengeFilters';
import { ChallengeCard } from './components/ChallengeCard';
import { ChallengeCardSkeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useChallenges } from './hooks/useChallenges';
import { cn } from '@/lib/utils';
import type { ChallengeListParams } from '@/services/challengeService';
import type { Category, Difficulty } from '@/types';

const PAGE_SIZE = 9;
const VALID_CATEGORIES: Category[] = ['web', 'crypto', 'forensics', 'reverse', 'pwn', 'osint', 'cloud', 'mobile'];
const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'insane'];
const VALID_SOLVED: ChallengeFilterState['solved'][] = ['all', 'solved', 'unsolved'];
const VALID_SORT: ChallengeFilterState['sort'][] = ['newest', 'points-asc', 'points-desc', 'solves'];

/**
 * Filters, sort, and page all round-trip through the URL so a filtered
 * view is shareable/bookmarkable/back-button-safe — search params are the
 * single source of truth (no separate React state duplicating them,
 * except the raw search box text, which needs to update every keystroke
 * ahead of the 300ms-debounced value that actually lands in the URL).
 */
function readFilters(searchParams: URLSearchParams): ChallengeFilterState {
  const category = searchParams.get('category');
  const difficulty = searchParams.get('difficulty');
  const solved = searchParams.get('solved');
  const sort = searchParams.get('sort');
  return {
    search: searchParams.get('q') ?? '',
    category: VALID_CATEGORIES.includes(category as Category) ? (category as Category) : 'all',
    difficulty: VALID_DIFFICULTIES.includes(difficulty as Difficulty) ? (difficulty as Difficulty) : 'all',
    solved: VALID_SOLVED.includes(solved as ChallengeFilterState['solved'])
      ? (solved as ChallengeFilterState['solved'])
      : 'all',
    sort: VALID_SORT.includes(sort as ChallengeFilterState['sort']) ? (sort as ChallengeFilterState['sort']) : 'newest',
  };
}

function readPage(searchParams: URLSearchParams): number {
  const page = Number(searchParams.get('page'));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/**
 * `hideHeader` is set by the OS wrapper (os/apps/ExploreApp.tsx) — not by
 * `isCompact`, which is a width-reflow signal (the window defaults to
 * 900px wide, so it's never "compact" by that measure) and means
 * something different. The window's own titlebar already says
 * "CHALLENGES.SYS", so the in-page heading is redundant there and drops
 * to just the manifest-style sublabel. The standalone public route
 * (`/challenges`, no titlebar) keeps the full heading.
 */
export function ChallengesPage({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  useDocumentTitle('Challenges');
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const page = readPage(searchParams);

  // Local-only so the search box updates every keystroke; the URL (and
  // thus the actual query) only picks it up after the debounce below.
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        if (debouncedSearch === (prev.get('q') ?? '')) return prev;
        const next = new URLSearchParams(prev);
        if (debouncedSearch) next.set('q', debouncedSearch);
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const params: ChallengeListParams = {
    search: filters.search || undefined,
    category: filters.category === 'all' ? undefined : filters.category,
    difficulty: filters.difficulty === 'all' ? undefined : filters.difficulty,
    solved: filters.solved === 'all' ? undefined : filters.solved,
    sort: filters.sort,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError, refetch, isPlaceholderData } = useChallenges(params);

  function handleFilterChange(next: ChallengeFilterState) {
    setSearchInput(next.search);
    setSearchParams(
      (prev) => {
        const merged = new URLSearchParams(prev);
        const entries: [string, string][] = [
          ['q', next.search],
          ['category', next.category === 'all' ? '' : next.category],
          ['difficulty', next.difficulty === 'all' ? '' : next.difficulty],
          ['solved', next.solved === 'all' ? '' : next.solved],
          ['sort', next.sort === 'newest' ? '' : next.sort],
        ];
        for (const [key, value] of entries) {
          if (value) merged.set(key, value);
          else merged.delete(key);
        }
        merged.delete('page');
        return merged;
      },
      { replace: true },
    );
  }

  function handlePageChange(next: number) {
    setSearchParams(
      (prev) => {
        const merged = new URLSearchParams(prev);
        if (next > 1) merged.set('page', String(next));
        else merged.delete('page');
        return merged;
      },
      { replace: true },
    );
  }

  return (
    <PageContainer className={cn('flex flex-col gap-6', hideHeader && 'px-3 py-4 sm:px-4')}>
      {hideHeader ? (
        <p className="font-mono text-xs text-[var(--color-text-muted)]">
          <span className="text-[var(--color-accent)]">$</span> ls ./challenges --filter
        </p>
      ) : (
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
            Challenges
          </h1>
          <p className="mt-1 font-mono text-xs text-[var(--color-text-muted)]">
            <span className="text-[var(--color-accent)]">$</span> ls ./challenges --filter
          </p>
        </div>
      )}

      <ChallengeFilters filters={{ ...filters, search: searchInput }} onChange={handleFilterChange} />

      {isError && <ErrorState onRetry={() => refetch()} />}

      {isLoading && (
        <div className="flex flex-col">
          {Array.from({ length: 6 }).map((_, i) => (
            <ChallengeCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && !isError && data && data.challenges.length === 0 && (
        <EmptyState
          icon={Flag}
          title="This region is unexplored"
          description="Nothing matches these filters yet — try widening your search."
        />
      )}

      {!isLoading && !isError && data && data.challenges.length > 0 && (
        <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="flex flex-col border-t border-[var(--color-border)]">
            {data.challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>

          <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={handlePageChange} className="mt-6" />
        </div>
      )}
    </PageContainer>
  );
}

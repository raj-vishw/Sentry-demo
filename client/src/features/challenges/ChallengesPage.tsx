import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ChallengeFilters, defaultFilters, type ChallengeFilterState } from './components/ChallengeFilters';
import { ChallengeCard } from './components/ChallengeCard';
import { ChallengeCardSkeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useChallenges } from './hooks/useChallenges';
import type { ChallengeListParams } from '@/services/challengeService';
import type { Category } from '@/types';

const PAGE_SIZE = 9;
const VALID_CATEGORIES: Category[] = ['web', 'crypto', 'forensics', 'reverse', 'pwn', 'osint', 'cloud', 'mobile'];

export function ChallengesPage() {
  useDocumentTitle('Challenges');
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<ChallengeFilterState>(() => {
    const categoryParam = searchParams.get('category');
    const category = VALID_CATEGORIES.includes(categoryParam as Category) ? (categoryParam as Category) : 'all';
    return { ...defaultFilters, category };
  });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  // Arriving from the observatory graph or command palette with a
  // ?category= link re-applies the filter even if this page instance is
  // already mounted (e.g. navigating between two category deep-links).
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && VALID_CATEGORIES.includes(categoryParam as Category)) {
      setFilters((f) => ({ ...f, category: categoryParam as Category }));
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('category')]);

  const params: ChallengeListParams = {
    search: debouncedSearch || undefined,
    category: filters.category === 'all' ? undefined : filters.category,
    difficulty: filters.difficulty === 'all' ? undefined : filters.difficulty,
    solved: filters.solved === 'all' ? undefined : filters.solved,
    sort: filters.sort,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError, refetch, isPlaceholderData } = useChallenges(params);

  function handleFilterChange(next: ChallengeFilterState) {
    setFilters(next);
    setPage(1);
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
          Explore
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Every challenge is a node in the graph — browse, filter, and follow what interests you.
        </p>
      </div>

      <ChallengeFilters filters={filters} onChange={handleFilterChange} />

      {isError && <ErrorState onRetry={() => refetch()} />}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
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
          <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
            {data.challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>

          <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} className="mt-6" />
        </div>
      )}
    </PageContainer>
  );
}

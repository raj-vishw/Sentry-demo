import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, PenLine } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ChallengeCardSkeleton } from '@/components/feedback/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuthStore } from '@/stores/authStore';
import { useAppAwarePath } from '@/lib/appPath';
import { CATEGORY_LIST } from '@/lib/categories';
import { useWriteupsList } from './hooks/useWriteups';
import { WriteupCard } from './components/WriteupCard';
import type { Category } from '@/types';

const PAGE_SIZE = 9;

export function WriteupsPage() {
  useDocumentTitle('Writeups');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const toPath = useAppAwarePath();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [sort, setSort] = useState<'newest' | 'most-viewed' | 'most-liked'>('newest');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isError, refetch, isPlaceholderData } = useWriteupsList({
    search: debouncedSearch || undefined,
    category: category === 'all' ? undefined : category,
    sort,
    page,
    limit: PAGE_SIZE,
  });

  return (
    <PageContainer className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">Writeups</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Technical breakdowns from operators who solved it first. Every writeup reveals a solution.
          </p>
        </div>
        {isAuthenticated && (
          <Link to={toPath('/writeups/create')}>
            <Button leftIcon={<PenLine className="size-4" />}>Write one</Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput
          placeholder="Search writeups..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search writeups"
          className="max-w-sm flex-1"
        />
        <Select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as Category | 'all');
            setPage(1);
          }}
          className="w-auto"
        >
          <option value="all">All categories</option>
          {CATEGORY_LIST.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="w-auto">
          <option value="newest">Newest</option>
          <option value="most-viewed">Most viewed</option>
          <option value="most-liked">Most liked</option>
        </Select>
      </div>

      {isError && <ErrorState onRetry={() => refetch()} />}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ChallengeCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && !isError && data && data.writeups.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No writeups yet"
          description="Solve a challenge, then share how you did it."
        />
      )}

      {!isLoading && !isError && data && data.writeups.length > 0 && (
        <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
            {data.writeups.map((w) => (
              <WriteupCard key={w.id} writeup={w} />
            ))}
          </div>
          <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} className="mt-6" />
        </div>
      )}
    </PageContainer>
  );
}

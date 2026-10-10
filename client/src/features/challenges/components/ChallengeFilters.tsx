import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CATEGORY_LIST, DIFFICULTY_META } from '@/lib/categories';
import { RotateCcw } from 'lucide-react';
import type { Category, Difficulty } from '@/types';

export interface ChallengeFilterState {
  search: string;
  category: Category | 'all';
  difficulty: Difficulty | 'all';
  solved: 'all' | 'solved' | 'unsolved';
  sort: 'newest' | 'points-asc' | 'points-desc' | 'solves';
}

export const defaultFilters: ChallengeFilterState = {
  search: '',
  category: 'all',
  difficulty: 'all',
  solved: 'all',
  sort: 'newest',
};

export function ChallengeFilters({
  filters,
  onChange,
}: {
  filters: ChallengeFilterState;
  onChange: (filters: ChallengeFilterState) => void;
}) {
  function update<K extends keyof ChallengeFilterState>(key: K, value: ChallengeFilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <SearchInput
        placeholder="Search challenges..."
        value={filters.search}
        onChange={(e) => update('search', e.target.value)}
        aria-label="Search challenges"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select
          aria-label="Category"
          value={filters.category}
          onChange={(e) => update('category', e.target.value as ChallengeFilterState['category'])}
        >
          <option value="all">All categories</option>
          {CATEGORY_LIST.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Difficulty"
          value={filters.difficulty}
          onChange={(e) => update('difficulty', e.target.value as ChallengeFilterState['difficulty'])}
        >
          <option value="all">All difficulties</option>
          {Object.entries(DIFFICULTY_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Solved status"
          value={filters.solved}
          onChange={(e) => update('solved', e.target.value as ChallengeFilterState['solved'])}
        >
          <option value="all">All statuses</option>
          <option value="solved">Solved</option>
          <option value="unsolved">Unsolved</option>
        </Select>

        <Select
          aria-label="Sort by"
          value={filters.sort}
          onChange={(e) => update('sort', e.target.value as ChallengeFilterState['sort'])}
        >
          <option value="newest">Newest</option>
          <option value="points-desc">Points: High to low</option>
          <option value="points-asc">Points: Low to high</option>
          <option value="solves">Most solved</option>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="size-3.5" />} onClick={() => onChange(defaultFilters)}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { pageService } from '@/services/pageService';

export function usePagesNav() {
  return useQuery({ queryKey: ['pages', 'nav'], queryFn: pageService.list, staleTime: Infinity });
}

export function usePage(slug: string | undefined) {
  return useQuery({
    queryKey: ['pages', 'content', slug],
    queryFn: () => pageService.get(slug!),
    enabled: !!slug,
  });
}

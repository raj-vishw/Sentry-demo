import { useQuery } from '@tanstack/react-query';
import { docsService } from '@/services/docsService';

export function useDocsNav() {
  return useQuery({ queryKey: ['docs', 'nav'], queryFn: docsService.list, staleTime: Infinity });
}

export function useDoc(slug: string | undefined) {
  return useQuery({
    queryKey: ['docs', 'content', slug],
    queryFn: () => docsService.get(slug!),
    enabled: !!slug,
  });
}

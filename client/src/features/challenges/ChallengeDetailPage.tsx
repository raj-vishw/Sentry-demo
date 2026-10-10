import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ChallengeWorkspace } from './components/ChallengeWorkspace';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function ChallengeDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  useDocumentTitle('Challenge');

  return (
    <PageContainer className="flex flex-col gap-5">
      <Link
        to="/challenges"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-4" /> Exit investigation
      </Link>
      <ChallengeWorkspace slug={slug!} />
    </PageContainer>
  );
}

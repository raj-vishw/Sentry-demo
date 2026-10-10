import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { WriteupView } from './components/WriteupView';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function WriteupDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  useDocumentTitle('Writeup');

  return (
    <PageContainer className="flex flex-col gap-5">
      <Link
        to="/writeups"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-4" /> Back to writeups
      </Link>
      <div className="glass-panel rounded-[var(--radius-lg)]">
        <WriteupView slug={slug!} />
      </div>
    </PageContainer>
  );
}

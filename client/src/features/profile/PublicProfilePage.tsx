import { useParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { PublicProfileView } from './components/PublicProfileView';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  useDocumentTitle(username ?? 'Operator');

  return (
    <PageContainer>
      <PublicProfileView username={username!} />
    </PageContainer>
  );
}

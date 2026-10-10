import { AppProviders } from '@/app/providers/AppProviders';
import { AppRouter } from '@/app/router';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { DemoBanner } from '@/components/layout/DemoBanner';

function App() {
  return (
    <AppProviders>
      <DemoBanner />
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
    </AppProviders>
  );
}

export default App;

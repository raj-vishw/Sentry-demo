import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ServerErrorPage } from '@/features/misc/ServerErrorPage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Must be a class component — React only supports catching render-phase
 * errors via `getDerivedStateFromError`/`componentDidCatch`, there is no
 * hook equivalent. Wraps the whole router so a render throw anywhere in the
 * tree shows a styled fallback instead of an unhandled white-screen crash.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Unhandled render error', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <ServerErrorPage onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

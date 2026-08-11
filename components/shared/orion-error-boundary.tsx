'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import Link from 'next/link';
import { AppErrorState, AppButton } from '@/components/ui/app-ui';

type Props = {
  children: ReactNode;
  /** Zone métier pour les logs (ex. POS, Dashboard) */
  zone?: string;
};

type State = {
  error: Error | null;
};

/**
 * ErrorBoundary global ORION — évite un écran blanc sur erreur React.
 * Complète app/(app)/error.tsx (erreurs de rendu serveur / segments).
 */
export class OrionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[orion-error-boundary]', this.props.zone ?? 'app', error, info.componentStack);
    void import('@/lib/monitoring/sentry-client').then(({ captureClientException }) => {
      captureClientException(error, {
        zone: this.props.zone ?? 'app',
        componentStack: info.componentStack,
      });
    }).catch(() => {});
  }

  render() {
    if (this.state.error) {
      const zone = this.props.zone ?? 'app';
      const homeHref = zone === 'POS' ? '/pos' : '/dashboard';
      const homeLabel = zone === 'POS' ? 'Catalogue POS' : 'Tableau de bord';
      const isDev = process.env.NODE_ENV === 'development';
      const err = this.state.error;
      return (
        <AppErrorState
          title="Module temporairement indisponible"
          message={
            isDev
              ? err.message
              : "Une erreur inattendue s'est produite. Réessayez ou retournez au tableau de bord."
          }
          onRetry={() => this.setState({ error: null })}
          action={
            <AppButton variant="outline" size="sm" asChild>
              <Link href={homeHref}>{homeLabel}</Link>
            </AppButton>
          }
          className="my-8"
        />
      );
    }
    return this.props.children;
  }
}

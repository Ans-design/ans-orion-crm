'use client';

import { useEffect } from 'react';
import { Home } from 'lucide-react';
import { AppButton, AppErrorState } from '@/components/ui/app-ui';

const isDev = process.env.NODE_ENV === 'development';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app-error]', error.message, error.stack, error.digest);
  }, [error]);

  const devDetail = isDev
    ? [error.message, error.digest ? `digest: ${error.digest}` : null].filter(Boolean).join(' · ')
    : undefined;

  return (
    <div className="space-y-4">
      <AppErrorState
        title="Une erreur est survenue"
        message={
          devDetail
            ? devDetail
            : 'Impossible de charger ce module. Réessayez ou retournez au tableau de bord.'
        }
        onRetry={reset}
        retryLabel="Réessayer"
        action={
          <AppButton variant="outline" asChild className="gap-2">
            <a href="/dashboard"><Home size={16} /> Dashboard</a>
          </AppButton>
        }
        className="min-h-[50vh] flex flex-col justify-center my-0 border-0 bg-transparent"
      />
      {isDev && error.stack && (
        <pre className="mx-auto max-w-3xl overflow-auto rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card-soft)] p-4 text-[11px] text-muted-foreground whitespace-pre-wrap">
          {error.stack}
        </pre>
      )}
    </div>
  );
}

'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
};

export function DegradedDataBanner({
  message = 'Certaines données sont indisponibles — affichage partiel.',
  onRetry,
  retrying = false,
}: Props) {
  return (
    <div
      role="alert"
      className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3"
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Mode dégradé</p>
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <AppButton variant="outline" size="sm" onClick={onRetry} disabled={retrying} className="shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5${retrying ? ' animate-spin' : ''}`} />
          Réessayer
        </AppButton>
      )}
    </div>
  );
}

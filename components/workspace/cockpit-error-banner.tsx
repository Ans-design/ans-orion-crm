'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CockpitErrorBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--ans-red)]/30 bg-[var(--ans-red)]/10 px-4 py-3 text-sm">
      <AlertTriangle className="shrink-0 text-[var(--ans-red-vivid)]" size={18} />
      <div className="flex-1">
        <p className="font-semibold">Données indisponibles</p>
        <p className="text-muted-foreground text-xs mt-0.5">Vérifiez votre connexion ou réessayez.</p>
      </div>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" onClick={onRetry} className="gap-1.5 shrink-0">
          <RefreshCw size={14} />
          Réessayer
        </Button>
      )}
    </div>
  );
}

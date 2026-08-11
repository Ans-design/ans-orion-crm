'use client';

import { Zap, X } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  open: boolean;
  materialLabel: string;
  stock: number;
  onIgnore: () => void;
  onConfirm: () => void;
};

/** Bandeau bas — brouillon commande fournisseur (stock critique / rupture). */
export function ReapproExpressBar({ open, materialLabel, stock, onIgnore, onConfirm }: Props) {
  if (!open) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-30 flex w-[min(640px,calc(100%-2rem))] -translate-x-1/2 items-center gap-3 rounded-[7px] border border-amber-500/35 bg-[var(--cps-surface)] px-4 py-3 shadow-[var(--cps-shadow-float)]">
      <span className="rounded-[7px] bg-amber-500/15 p-2 text-[var(--cps-warn-text)]">
        <Zap className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--cps-title)]">Réapprovisionnement express</p>
        <p className="truncate text-xs text-[var(--cps-muted)]">
          {materialLabel} — stock {stock}. Créer un brouillon commande fournisseur ?
        </p>
      </div>
      <AppButton type="button" variant="outline" onClick={onIgnore}>
        Ignorer
      </AppButton>
      <AppButton type="button" variant="default" onClick={onConfirm}>
        Créer brouillon
      </AppButton>
      <AppButton type="button" variant="outline" size="icon" onClick={onIgnore} aria-label="Fermer">
        <X className="h-4 w-4" />
      </AppButton>
    </div>
  );
}

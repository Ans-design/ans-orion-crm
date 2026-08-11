'use client';

import { PrixMatieresStockWorkspace } from '@/components/administration/prix-matieres-stock/PrixMatieresStockWorkspace';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  canEdit: boolean;
  onOpenDiagnostics?: () => void;
  onOpenHistory?: () => void;
  onOpenParity?: () => void;
};

/** Centre Excel + raccourcis Données & contrôle (domaine 6). */
export function ExcelManager({
  canEdit,
  onOpenDiagnostics,
  onOpenHistory,
  onOpenParity,
}: Props) {
  void canEdit;
  return (
    <div className="space-y-3">
      {(onOpenDiagnostics || onOpenHistory || onOpenParity) ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Raccourcis données">
          {onOpenParity ? (
            <AppButton type="button" variant="outline" onClick={onOpenParity}>
              Parité Admin ↔ POS
            </AppButton>
          ) : null}
          {onOpenDiagnostics ? (
            <AppButton type="button" variant="outline" onClick={onOpenDiagnostics}>
              Diagnostics / anomalies
            </AppButton>
          ) : null}
          {onOpenHistory ? (
            <AppButton type="button" variant="outline" onClick={onOpenHistory}>
              Historique & corbeille
            </AppButton>
          ) : null}
        </div>
      ) : null}
      <p className="m-0 text-xs text-[var(--cps-muted,#64748b)]">
        Import / export métier — aucune écriture avant confirmation. Après import, vérifier la parité POS
        avant de publier.
      </p>
      <PrixMatieresStockWorkspace embedded forcedTab="excel" />
    </div>
  );
}

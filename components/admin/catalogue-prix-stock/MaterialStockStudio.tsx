'use client';

import dynamic from 'next/dynamic';
import { MaterialsExcelBridge } from '@/components/administration/materials/MaterialsExcelBridge';

const MaterialsUnifiedWorkspace = dynamic(
  () =>
    import('@/components/administration/materials/MaterialsUnifiedWorkspace').then(
      (m) => m.MaterialsUnifiedWorkspace,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="cps-master-table-skeleton" role="status" aria-live="polite">
        <div className="cps-master-table-skeleton__bar" />
        <div className="cps-master-table-skeleton__bar cps-master-table-skeleton__bar--short" />
        <div className="cps-master-table-skeleton__grid" />
        <span className="sr-only">Chargement de la table matières…</span>
      </div>
    ),
  },
);

export type MaterialStockMode = 'matieres' | 'prix-contexte' | 'stock';

type Props = {
  /** Conservé pour deep-links legacy. */
  mode?: MaterialStockMode;
  canEdit: boolean;
  createToken?: number;
  costsBadge?: number | null;
};

/**
 * Domaine Matières — pont Excel monté immédiatement (header Importer / Exporter),
 * table lazie pour la perf.
 */
export function MaterialStockStudio({
  canEdit,
  createToken = 0,
}: Props) {
  return (
    <>
      {/* Pont Excel prêt avant lazy-load de la table */}
      <MaterialsExcelBridge canEdit={canEdit} />
      <MaterialsUnifiedWorkspace
        canEdit={canEdit}
        focusHint="all"
        hubEmbedded
        columnPreset="master"
        defaultFilterChip="all"
        createToken={createToken}
      />
    </>
  );
}

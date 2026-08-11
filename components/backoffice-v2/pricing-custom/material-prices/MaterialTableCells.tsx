'use client';

import { AlertTriangle } from 'lucide-react';
import { AdminTableBadge } from '../../ui/AdminTablePrimitives';
import type { MaterialPriceUnifiedRow } from './types';

function compactLabel(row: MaterialPriceUnifiedRow): string {
  const n = row.anomaliesCount;
  if (n === 0) return '';
  const critical = row.anomalies.filter((a: string) => /critique|manquant|obligatoire/i.test(a)).length;
  if (critical > 0) return `${critical} crit.`;
  if (n === 1) return '1';
  return String(n);
}

/** Compteur compact — détail au survol uniquement, sans ouvrir de panneau */
export function MaterialAnomalyCompactCell({ row }: { row: MaterialPriceUnifiedRow }) {
  if (row.anomaliesCount === 0) {
    return <span className="orion-master-muted">—</span>;
  }

  const label = compactLabel(row);
  const title = row.anomalies.join('\n');

  return (
    <span className="orion-master-anomaly-compact is-static" title={title}>
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function MaterialStockStatusBadge({ row }: { row: MaterialPriceUnifiedRow }) {
  if (!row.stockItemId && !row.stockDisplay) {
    return <AdminTableBadge kind="stock-unlinked" label="Non lié" />;
  }
  if (row.stockStatus === 'rupture') {
    return <AdminTableBadge kind="anomaly" label="Rupture" />;
  }
  if (row.stockStatus === 'critique') {
    return <AdminTableBadge kind="draft" label="Faible" />;
  }
  return <AdminTableBadge kind="stock-linked" label="Lié" />;
}

export function MaterialStatusBadge({ row }: { row: MaterialPriceUnifiedRow }) {
  if (row.archived || row.publicationStatus === 'archived') {
    return <span className="orion-mat-pill is-muted">Archivé</span>;
  }
  if (row.stockStatus === 'rupture') {
    return <span className="orion-mat-pill is-out">Rupture</span>;
  }
  if (row.anomaliesCount > 0 || row.stockStatus === 'critique') {
    return <span className="orion-mat-pill is-low">Alerte</span>;
  }
  if (!row.active) {
    return <span className="orion-mat-pill is-muted">Inactif</span>;
  }
  return <span className="orion-mat-pill is-ok">Actif</span>;
}

export function MaterialTableMuted({ children }: { children: React.ReactNode }) {
  return <span className="orion-master-muted orion-admin-table-ellipsis">{children}</span>;
}

import { groupMasterDataRows } from '@/lib/backoffice/master-data-grouping';
import { deriveMaterialTableFields } from '@/lib/backoffice/material-table-fields';
import type { MaterialPriceUnifiedRow } from '@/components/backoffice-v2/pricing-custom/material-prices/types';

export type MaterialGroupSummary = {
  groupKey: string;
  label: string;
  family: string;
  variantCount: number;
  variantLabels: string[];
  priceCount: number;
  missingPriceCount: number;
  stockLinkedCount: number;
  posVisibleCount: number;
  status: 'published' | 'draft' | 'mixed' | 'review';
  alertCount: number;
  anomalyCount: number;
  rows: MaterialPriceUnifiedRow[];
};

function publicationPriority(status: string): number {
  if (status === 'published') return 4;
  if (status === 'draft') return 3;
  if (status === 'review') return 2;
  return 1;
}

function aggregateStatus(rows: MaterialPriceUnifiedRow[]): MaterialGroupSummary['status'] {
  const statuses = new Set(rows.map((r) => r.publicationStatus ?? 'draft'));
  if (statuses.size === 1) {
    const only = [...statuses][0]!;
    if (only === 'published') return 'published';
    if (only === 'review') return 'review';
    return 'draft';
  }
  const max = Math.max(...rows.map((r) => publicationPriority(r.publicationStatus ?? 'draft')));
  if (max >= 4) return 'mixed';
  return 'draft';
}

export function aggregateMaterialGroups(rows: MaterialPriceUnifiedRow[]): MaterialGroupSummary[] {
  const groups = groupMasterDataRows(rows);

  return groups.map((g) => {
    const variantLabels = g.rows.map((r) => {
      const fields = deriveMaterialTableFields(r);
      return fields.mainCharacteristic?.displayValue ?? fields.mainCharacteristic?.display ?? r.grammage ?? r.thickness ?? '—';
    });

    const priceCount = g.rows.filter((r) => r.basePrintPrice != null).length;
    const missingPriceCount = g.rows.length - priceCount;
    const stockLinkedCount = g.rows.filter((r) => Boolean(r.stockItemId)).length;
    const posVisibleCount = g.rows.filter((r) => r.visiblePOS).length;
    const anomalyCount = g.rows.reduce((sum, r) => sum + (r.anomaliesCount ?? 0), 0);
    const alertCount = g.rows.filter((r) => {
      if (!r.stockItemId) return true;
      if (r.stockStatus === 'low' || r.stockStatus === 'rupture' || r.stockStatus === 'critical') return true;
      if (r.stockThreshold != null && r.stockAvailable != null && r.stockAvailable <= r.stockThreshold) return true;
      return false;
    }).length;

    const family = g.rows.find((r) => r.family)?.family ?? 'Autre';

    return {
      groupKey: g.key,
      label: g.label,
      family,
      variantCount: g.rows.length,
      variantLabels,
      priceCount,
      missingPriceCount,
      stockLinkedCount,
      posVisibleCount,
      status: aggregateStatus(g.rows),
      alertCount,
      anomalyCount,
      rows: g.rows,
    };
  });
}

export function formatVariantSummary(labels: string[], max = 4): string {
  if (labels.length === 0) return '—';
  const shown = labels.slice(0, max);
  const rest = labels.length - shown.length;
  const text = shown.join(' · ');
  return rest > 0 ? `${text} +${rest}` : text;
}

export function formatPriceSummary(priceCount: number, missingPriceCount: number): string {
  if (priceCount === 0 && missingPriceCount > 0) return `${missingPriceCount} manquant${missingPriceCount > 1 ? 's' : ''}`;
  if (missingPriceCount > 0) return `${priceCount} prix · ${missingPriceCount} manquant${missingPriceCount > 1 ? 's' : ''}`;
  return `${priceCount} prix`;
}

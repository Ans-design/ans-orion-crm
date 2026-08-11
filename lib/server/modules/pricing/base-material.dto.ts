import type { BaseMaterialRow } from './base-material.repository';
import { resolveMaterialCommercialUsage } from '@/lib/backoffice/material-commercial-usage';

export type MaterialDto = {
  id: string;
  excelRowId?: string | null;
  name: string;
  family: string | null;
  grammage: string | null;
  thickness: string | null;
  format: string | null;
  unit: string | null;
  unitDisplay: string | null;
  unitStandard: string | null;
  conversionFactor: number | null;
  stockItemId: string | null;
  stockAvailable: number | null;
  stockThreshold: number | null;
  purchasePrice: number | null;
  /** Prix de vente support sans impression. */
  blankSellPrice: number | null;
  basePrintPrice: number | null;
  maxPrice: number | null;
  marginTarget: number | null;
  marginMin: number | null;
  active: boolean;
  visiblePOS: boolean;
  /** Usage commercial dérivé (§12) — préférer à visiblePOS seul. */
  commercialUsage: import('@/lib/backoffice/material-commercial-usage').MaterialCommercialUsageId;
  impactsPrice: boolean;
  impactsStock: boolean;
  archived: boolean;
  source: string;
  linkedArticlesCount: number;
  anomaliesCount: number;
  materialKey: string;
  publicationStatus: string;
  anomalyNotes?: string | null;
  anomalies: string[];
};

export type MaterialsStatsDto = {
  total: number;
  active: number;
  visiblePOS: number;
  withPrice: number;
  missingPrice: number;
};

export function mapToMaterialDto(
  row: BaseMaterialRow & { anomalies?: string[]; linkedArticlesCount?: number; stockAvailable?: number | null },
): MaterialDto {
  const anomalies = row.anomalies ?? [];
  return {
    id: row.id,
    excelRowId: row.excelRowId ?? null,
    name: row.label,
    family: row.family ?? null,
    grammage: row.grammage,
    thickness: row.thickness ?? null,
    format: row.formatStandard,
    unit: row.saleUnit ?? null,
    unitDisplay: row.unitDisplay ?? null,
    unitStandard: row.unitStandard ?? null,
    conversionFactor: row.conversionFactor ?? null,
    stockItemId: row.stockItemId ?? null,
    stockAvailable: row.stockAvailable ?? null,
    stockThreshold: row.stockThreshold ?? null,
    purchasePrice: row.purchasePrice,
    blankSellPrice:
      (row as { blankSellPrice?: number | null }).blankSellPrice
      ?? (row.maxPrice != null && row.maxPrice > 0 ? row.maxPrice : null),
    basePrintPrice: row.basePrintPrice,
    maxPrice: row.maxPrice,
    marginTarget: row.targetMargin,
    marginMin: row.minMargin,
    active: row.active,
    visiblePOS: row.visiblePos,
    commercialUsage: resolveMaterialCommercialUsage({
      active: row.active,
      archived: row.archived,
      visiblePOS: row.visiblePos,
      impactsStock: row.impactsStock,
      impactsPrice: row.impactsPrice,
      blankSellPrice:
        (row as { blankSellPrice?: number | null }).blankSellPrice
        ?? (row.maxPrice != null && row.maxPrice > 0 ? row.maxPrice : null),
      linkedArticlesCount: row.linkedArticlesCount ?? 0,
      anomaliesCount: (row.anomalies ?? []).length,
    }),
    impactsPrice: row.impactsPrice,
    impactsStock: row.impactsStock,
    archived: row.archived ?? false,
    source: row.source ?? 'unknown',
    linkedArticlesCount: row.linkedArticlesCount ?? 0,
    anomaliesCount: anomalies.length,
    materialKey: row.materialKey,
    publicationStatus: row.publicationStatus,
    anomalyNotes: row.anomalyNotes ?? null,
    anomalies,
  };
}

export function computeMaterialsStats(materials: MaterialDto[]): MaterialsStatsDto {
  return {
    total: materials.length,
    active: materials.filter((m) => m.active && !m.archived).length,
    visiblePOS: materials.filter((m) => m.visiblePOS).length,
    withPrice: materials.filter((m) => m.basePrintPrice != null || m.blankSellPrice != null).length,
    missingPrice: materials.filter((m) => m.active && m.basePrintPrice == null).length,
  };
}

export const EMPTY_MATERIALS_STATS: MaterialsStatsDto = {
  total: 0,
  active: 0,
  visiblePOS: 0,
  withPrice: 0,
  missingPrice: 0,
};

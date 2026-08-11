import { expandAllCatalogMaterials } from '@/lib/server/modules/materials/materials-catalog-expander';
import type { BaseMaterialRow } from '../pricing/base-material.repository';

/** Matières depuis catalogues officiels — sans table BaseMaterial. */
export async function listBaseMaterialsFromCatalogFallback(): Promise<BaseMaterialRow[]> {
  const now = new Date();
  return expandAllCatalogMaterials().map((m) => ({
    id: `catalog-${m.materialKey}`,
    materialKey: m.materialKey,
    label: m.label,
    family: m.family,
    grammage: m.grammage,
    formatStandard: null,
    widthMm: null,
    heightMm: null,
    dimensionUnit: 'mm',
    saleUnit: m.unitStandard ?? 'feuille',
    basePrintType: null,
    purchasePrice: null,
    basePrintPrice: null,
    maxPrice: null,
    targetMargin: null,
    minMargin: null,
    active: true,
    visiblePos: true,
    impactsPrice: true,
    impactsStock: true,
    source: m.source,
    anomalyNotes: null,
    publicationStatus: 'draft',
    updatedAt: now,
    thickness: m.thickness,
    normalizedName: m.normalizedName,
    displayName: m.displayName,
    aliases: JSON.stringify(m.aliases),
    unitDisplay: m.unitDisplay,
    unitStandard: m.unitStandard,
    conversionFactor: m.conversionFactor,
    stockItemId: null,
    stockThreshold: null,
    stockLocation: null,
    archived: false,
    archivedAt: null,
  }));
}

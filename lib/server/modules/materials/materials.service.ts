import { prisma } from '@/lib/prisma';
import { expandAllCatalogMaterials } from '@/lib/server/modules/materials/materials-catalog-expander';
import { isLegacyMergedPaperLabel, normalizeLegacyPaperLabel } from '@/lib/backoffice/material-table-fields';
import {
  createBaseMaterial,
  listBaseMaterials,
} from '../pricing/base-material.repository';
import { hasBaseMaterialDelegate } from '../pricing/prisma-delegate-check';
import { isPrismaMissingTableError } from '../pricing/prisma-safe';
import { detectConversionAnomalies } from '../materials/materials-unit-conversion.service';

export type CreateMaterialInput = {
  materialKey: string;
  label: string;
  family?: string;
  grammage?: string | null;
  thickness?: string | null;
  formatStandard?: string | null;
  saleUnit?: string | null;
  unitDisplay?: string | null;
  unitStandard?: string | null;
  conversionFactor?: number | null;
  purchasePrice?: number | null;
  basePrintPrice?: number | null;
  maxPrice?: number | null;
  targetMargin?: number | null;
  minMargin?: number | null;
  stockItemId?: string | null;
  visiblePos?: boolean;
  active?: boolean;
  impactsPrice?: boolean;
  impactsStock?: boolean;
  publicationStatus?: string;
};

export async function createMaterial(input: CreateMaterialInput) {
  const key =
    input.materialKey.trim()
    || `mat-${input.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
  return createBaseMaterial({
    materialKey: key,
    label: input.label,
    family: input.family ?? 'Petit format',
    grammage: input.grammage ?? null,
    thickness: input.thickness ?? null,
    formatStandard: input.formatStandard ?? null,
    saleUnit: input.saleUnit ?? input.unitStandard ?? input.unitDisplay ?? 'feuille',
    unitDisplay: input.unitDisplay ?? null,
    unitStandard: input.unitStandard ?? null,
    conversionFactor: input.conversionFactor ?? null,
    purchasePrice: input.purchasePrice ?? null,
    basePrintPrice: input.basePrintPrice ?? null,
    maxPrice: input.maxPrice ?? null,
    targetMargin: input.targetMargin ?? null,
    minMargin: input.minMargin ?? null,
    stockItemId: input.stockItemId ?? null,
    visiblePos: input.visiblePos ?? true,
    active: input.active ?? true,
    impactsPrice: input.impactsPrice ?? true,
    impactsStock: input.impactsStock ?? true,
    publicationStatus: input.publicationStatus ?? 'draft',
    source: 'manual-create',
  });
}

export async function importAllCatalogMaterialsToDb(options?: {
  dryRun?: boolean;
}): Promise<{
  created: number;
  skipped: number;
  updated: number;
  dryRun: boolean;
  sampleCreates: Array<{ materialKey: string; label: string; family: string | null }>;
  sampleUpdates: Array<{ materialKey: string; label: string; nextLabel: string }>;
}> {
  const dryRun = options?.dryRun === true;
  if (!hasBaseMaterialDelegate(prisma)) {
    return {
      created: 0,
      skipped: 0,
      updated: 0,
      dryRun,
      sampleCreates: [],
      sampleUpdates: [],
    };
  }
  const catalog = expandAllCatalogMaterials();
  let created = 0;
  let skipped = 0;
  let updated = 0;
  const sampleCreates: Array<{ materialKey: string; label: string; family: string | null }> = [];
  const sampleUpdates: Array<{ materialKey: string; label: string; nextLabel: string }> = [];

  for (const c of catalog) {
    try {
      const existing = await prisma.baseMaterial.findUnique({ where: { materialKey: c.materialKey } });
      if (existing) {
        if (isLegacyMergedPaperLabel(existing.label)) {
          const fixed = normalizeLegacyPaperLabel(existing.label, existing.grammage, existing.materialKey);
          if (fixed !== existing.label) {
            if (!dryRun) {
              await prisma.baseMaterial.update({
                where: { id: existing.id },
                data: {
                  label: fixed,
                  displayName: fixed,
                  normalizedName: c.normalizedName,
                },
              });
            }
            updated++;
            if (sampleUpdates.length < 25) {
              sampleUpdates.push({
                materialKey: c.materialKey,
                label: existing.label,
                nextLabel: fixed,
              });
            }
            continue;
          }
        }
        skipped++;
        continue;
      }
      if (!dryRun) {
        await createBaseMaterial({
          materialKey: c.materialKey,
          label: c.label,
          normalizedName: c.normalizedName,
          displayName: c.displayName,
          aliases: JSON.stringify(c.aliases),
          family: c.family,
          grammage: c.grammage,
          thickness: c.thickness,
          unitDisplay: c.unitDisplay,
          unitStandard: c.unitStandard,
          conversionFactor: c.conversionFactor,
          saleUnit: c.unitStandard ?? 'feuille',
          source: c.source,
          publicationStatus: 'draft',
        });
      }
      created++;
      if (sampleCreates.length < 40) {
        sampleCreates.push({
          materialKey: c.materialKey,
          label: c.label,
          family: c.family ?? null,
        });
      }
    } catch (err) {
      if (isPrismaMissingTableError(err)) {
        return { created, skipped, updated, dryRun, sampleCreates, sampleUpdates };
      }
      throw err;
    }
  }
  return { created, skipped, updated, dryRun, sampleCreates, sampleUpdates };
}

export function enrichMaterialAnomaliesExtended(
  row: Awaited<ReturnType<typeof listBaseMaterials>>['rows'][0] & { anomalies?: string[] },
) {
  const anomalies = [...(row.anomalies ?? [])];
  if (row.active && row.basePrintPrice == null && row.maxPrice == null) {
    anomalies.push('Prix base impression sans finition manquant');
  }
  if (row.visiblePos && !row.active) anomalies.push('Visible POS mais inactive');
  if (row.basePrintPrice != null && row.purchasePrice != null && row.basePrintPrice < row.purchasePrice) {
    anomalies.push('Prix base inférieur au prix achat');
  }
  if (row.minMargin != null && row.targetMargin != null && row.targetMargin < row.minMargin) {
    anomalies.push('Marge cible sous marge minimum');
  }
  if (row.impactsStock && !row.stockItemId) {
    anomalies.push('Impact stock sans stock lié');
  }
  anomalies.push(
    ...detectConversionAnomalies({
      unitDisplay: row.unitDisplay,
      unitStandard: row.unitStandard,
      conversionFactor: row.conversionFactor,
      widthMm: row.widthMm,
      heightMm: row.heightMm,
    }),
  );
  return { ...row, anomalies: [...new Set(anomalies)] };
}

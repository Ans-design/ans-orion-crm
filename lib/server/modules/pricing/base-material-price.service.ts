import { prisma } from '@/lib/prisma';
import { patchBaseMaterial } from './base-material.repository';
import { patchBasePrintingPrice } from './base-printing-price.service';
import { publishBaseMaterialsPricing } from './pricing-publication.service';
import {
  invalidateAdminCaches,
  propagateAllPublishedMaterialPrices,
  propagatePublishedMaterialPrice,
} from '@/lib/services/admin-data-sync.service';

export type PatchUnifiedMaterialPriceInput = {
  materialId: string;
  basePrintingPriceId?: string | null;
  label?: string;
  family?: string;
  materialKey?: string;
  grammage?: string | null;
  thickness?: string | null;
  formatStandard?: string | null;
  face?: string | null;
  saleUnit?: string | null;
  unitDisplay?: string | null;
  unitStandard?: string | null;
  conversionFactor?: number | null;
  purchasePrice?: number | null;
  basePrintPrice?: number | null;
  blankSellPrice?: number | null;
  maxPrice?: number | null;
  targetMargin?: number | null;
  minMargin?: number | null;
  active?: boolean;
  visiblePos?: boolean;
  impactsPrice?: boolean;
  impactsStock?: boolean;
  stockItemId?: string | null;
  publicationStatus?: string;
  anomalyNotes?: string | null;
  reason?: string;
};

export async function patchUnifiedMaterialPriceRow(input: PatchUnifiedMaterialPriceInput) {
  if (input.materialId.startsWith('print-')) {
    const bppId = input.basePrintingPriceId ?? input.materialId.slice('print-'.length);
    const existing = await prisma.basePrintingPrice.findUnique({
      where: { id: bppId },
      select: { publicationStatus: true, active: true },
    });
    const printPatch: Record<string, unknown> = {};
    if (input.visiblePos !== undefined) printPatch.active = input.visiblePos;
    if (input.active !== undefined) printPatch.active = input.active;
    if (input.basePrintPrice !== undefined) printPatch.basePrice = input.basePrintPrice;
    if (input.purchasePrice !== undefined) printPatch.materialCost = input.purchasePrice;
    if (input.blankSellPrice !== undefined) printPatch.maxSafetyPrice = input.blankSellPrice;
    if (input.maxPrice !== undefined) printPatch.maxSafetyPrice = input.maxPrice;
    if (input.grammage !== undefined) printPatch.grammage = input.grammage;
    if (input.formatStandard !== undefined) printPatch.formatLabel = input.formatStandard;
    if (input.face !== undefined) printPatch.face = input.face;
    if (input.publicationStatus != null) {
      printPatch.publicationStatus = input.publicationStatus;
    } else if (existing?.publicationStatus === 'published') {
      printPatch.keepPublished = true;
      printPatch.publicationStatus = 'published';
    }
    if (!Object.keys(printPatch).length) {
      throw new Error('Aucune modification pour cette ligne prix article');
    }
    const updated = await patchBasePrintingPrice(bppId, printPatch);
    try {
      invalidateAdminCaches();
    } catch {
      /* best-effort */
    }
    return {
      id: input.materialId,
      visiblePos: input.visiblePos ?? updated.active,
      active: updated.active,
      publicationStatus: (updated as { publicationStatus?: string }).publicationStatus ?? 'draft',
    };
  }

  const materialPatch: Record<string, unknown> = {};
  if (input.label != null) materialPatch.label = input.label;
  if (input.family != null) materialPatch.family = input.family;
  if (input.materialKey != null) materialPatch.materialKey = input.materialKey;
  if (input.grammage !== undefined) materialPatch.grammage = input.grammage;
  if (input.thickness !== undefined) materialPatch.thickness = input.thickness;
  if (input.formatStandard !== undefined) materialPatch.formatStandard = input.formatStandard;
  if (input.saleUnit !== undefined) materialPatch.saleUnit = input.saleUnit;
  if (input.unitDisplay !== undefined) materialPatch.unitDisplay = input.unitDisplay;
  if (input.unitStandard !== undefined) materialPatch.unitStandard = input.unitStandard;
  if (input.conversionFactor !== undefined) materialPatch.conversionFactor = input.conversionFactor;
  if (input.purchasePrice !== undefined) materialPatch.purchasePrice = input.purchasePrice;
  if (input.basePrintPrice !== undefined) materialPatch.basePrintPrice = input.basePrintPrice;
  if (input.blankSellPrice !== undefined) {
    materialPatch.blankSellPrice = input.blankSellPrice;
    if (input.maxPrice === undefined) materialPatch.maxPrice = input.blankSellPrice;
  }
  if (input.maxPrice !== undefined) {
    materialPatch.maxPrice = input.maxPrice;
    if (input.blankSellPrice === undefined) materialPatch.blankSellPrice = input.maxPrice;
  }
  if (input.targetMargin !== undefined) materialPatch.targetMargin = input.targetMargin;
  if (input.minMargin !== undefined) materialPatch.minMargin = input.minMargin;
  if (input.active !== undefined) materialPatch.active = input.active;
  if (input.visiblePos !== undefined) materialPatch.visiblePos = input.visiblePos;
  if (input.impactsPrice !== undefined) materialPatch.impactsPrice = input.impactsPrice;
  if (input.impactsStock !== undefined) materialPatch.impactsStock = input.impactsStock;
  if (input.stockItemId !== undefined) materialPatch.stockItemId = input.stockItemId;
  if (input.publicationStatus != null) materialPatch.publicationStatus = input.publicationStatus;
  if (input.anomalyNotes !== undefined) materialPatch.anomalyNotes = input.anomalyNotes;

  const material = await prisma.$transaction(async (tx) => {
    const existing = await tx.baseMaterial.findUnique({
      where: { id: input.materialId },
      select: { publicationStatus: true },
    });
    // Contenu sans statut explicite :
    // - ligne déjà publiée → reste publiée (sync POS immédiate)
    // - sinon → brouillon
    if (
      Object.keys(materialPatch).length > 0
      && materialPatch.publicationStatus === undefined
    ) {
      materialPatch.publicationStatus =
        existing?.publicationStatus === 'published' ? 'published' : 'draft';
    }

    const updated = await tx.baseMaterial.update({
      where: { id: input.materialId },
      data: materialPatch as Parameters<typeof prisma.baseMaterial.update>[0]['data'],
    });

    if (input.basePrintingPriceId) {
      const printPatch: Record<string, unknown> = {};
      if (input.purchasePrice !== undefined) printPatch.materialCost = input.purchasePrice;
      if (input.basePrintPrice !== undefined) printPatch.basePrice = input.basePrintPrice;
      if (input.blankSellPrice !== undefined) printPatch.maxSafetyPrice = input.blankSellPrice;
      if (input.maxPrice !== undefined) printPatch.maxSafetyPrice = input.maxPrice;
      if (input.grammage !== undefined) printPatch.grammage = input.grammage;
      if (input.formatStandard !== undefined) printPatch.formatLabel = input.formatStandard;
      if (input.face !== undefined) printPatch.face = input.face;
      if (input.publicationStatus != null) printPatch.publicationStatus = input.publicationStatus;
      printPatch.baseMaterialId = updated.id;
      if (Object.keys(printPatch).length) {
        await tx.basePrintingPrice.update({
          where: { id: input.basePrintingPriceId },
          data: printPatch as Parameters<typeof prisma.basePrintingPrice.update>[0]['data'],
        });
      }
    }

    // MaterialContextPrice — findFirst + create/update (baseFormat nullable ≠ unique fiable)
    try {
      const syncContext = async (
        priceContext: string,
        priceUnit: string,
        baseFormat: string | null,
        priceHT: number | null | undefined,
        costHT?: number | null,
      ) => {
        if (priceHT === undefined) return;
        const existing = await tx.materialContextPrice.findFirst({
          where: {
            baseMaterialId: updated.id,
            priceContext,
            priceUnit,
            baseFormat: baseFormat ?? null,
          },
        });
        if (priceHT != null && priceHT > 0) {
          const data = {
            materialKey: updated.materialKey,
            priceHT,
            costHT: costHT ?? null,
            sourceTable: 'BaseMaterial',
            sourceRowId: updated.id,
            active: true,
          };
          if (existing) {
            await tx.materialContextPrice.update({ where: { id: existing.id }, data });
          } else {
            await tx.materialContextPrice.create({
              data: {
                baseMaterialId: updated.id,
                priceContext,
                priceUnit,
                baseFormat,
                ...data,
              },
            });
          }
        } else if (existing) {
          await tx.materialContextPrice.update({
            where: { id: existing.id },
            data: { active: false },
          });
        }
      };

      await syncContext(
        'PRINT_SMALL_FORMAT',
        'a4',
        input.formatStandard || 'A4',
        input.basePrintPrice,
        input.purchasePrice ?? updated.purchasePrice,
      );
      await syncContext(
        'RAW_STOCK',
        'piece',
        null,
        input.purchasePrice,
      );
    } catch {
      // Table absente / schéma partiel — ne pas faire échouer le patch matière
    }

    return updated;
  });

  // Audit léger (non bloquant)
  try {
    const { logAudit } = await import('@/lib/audit');
    await logAudit({
      action: 'PATCH_MATERIAL_PRICE',
      entity: 'BaseMaterial',
      entityId: material.id,
      entityLabel: material.label,
      details: {
        reason: input.reason ?? null,
        publicationStatus: material.publicationStatus,
        fields: Object.keys(materialPatch),
      },
    });
  } catch {
    /* audit optionnel */
  }

  try {
    invalidateAdminCaches();
  } catch {
    /* cache optionnel */
  }

  // Ligne publiée → propager prix / visibilité vers Catalogue POS
  if (material.publicationStatus === 'published' && !material.archived) {
    try {
      await propagatePublishedMaterialPrice(material.id);
    } catch {
      /* propagation best-effort */
    }
  } else if (
    material.archived
    || material.visiblePos === false
    || material.publicationStatus === 'draft'
    || material.active === false
  ) {
    const priceTouched =
      input.basePrintPrice !== undefined
      || input.blankSellPrice !== undefined
      || input.maxPrice !== undefined
      || input.visiblePos !== undefined
      || input.active !== undefined
      || input.publicationStatus !== undefined;
    if (priceTouched && (material.archived || material.visiblePos === false || material.active === false)) {
      try {
        const { withdrawMaterialFromPos } = await import('@/lib/services/admin-data-sync.service');
        await withdrawMaterialFromPos(material.id);
      } catch {
        /* best-effort */
      }
    }
  }

  return material;
}

export async function publishMaterialPriceRow(
  materialId: string,
  basePrintingPriceId?: string | null,
  opts?: { userId?: string; userName?: string },
) {
  const now = new Date();
  await prisma.baseMaterial.update({
    where: { id: materialId },
    data: { publicationStatus: 'published', updatedAt: now },
  });
  if (basePrintingPriceId) {
    await prisma.basePrintingPrice.update({
      where: { id: basePrintingPriceId },
      data: { publicationStatus: 'published', updatedAt: now },
    });
  }
  const propagation = await propagatePublishedMaterialPrice(materialId, opts);
  return { published: true, propagation };
}

export async function publishAllDraftMaterialPrices(userId?: string) {
  const result = await publishBaseMaterialsPricing(userId);
  const propagations = await propagateAllPublishedMaterialPrices({ userId });
  invalidateAdminCaches();
  return { ...result, propagations: propagations.length };
}

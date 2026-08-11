import { prisma } from '@/lib/prisma';
import { buildMaterialKey } from '../materials/material-key';
import { asStockExtended } from './stock.types';
import { syncMaterialFromStockItem } from '../materials/material-stock-sync.service';

/**
 * Liaison matière ↔ stock atomique (une seule transaction).
 * Idempotente : réutilise le lien existant si déjà cohérent.
 */
export async function linkStockToMaterial(stockItemId: string, materialId?: string) {
  const raw = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
  if (!raw) throw new Error('Article stock introuvable');
  const stock = asStockExtended(raw);

  const result = await prisma.$transaction(async (tx) => {
    let materialIdResolved = materialId;

    if (!materialIdResolved) {
      const key = buildMaterialKey(stock.materialKey ?? stock.paperType ?? stock.sku, stock.grammage);
      let material = await tx.baseMaterial.findFirst({
        where: { OR: [{ materialKey: key }, { stockItemId: stock.id }] },
      });

      if (!material) {
        // createBaseMaterial hors tx utilise prisma global — inline create dans tx
        material = await tx.baseMaterial.create({
          data: {
            materialKey: key,
            label: stock.label,
            family: stock.category === 'GrandFormat' ? 'Grand format' : 'Petit format',
            grammage: stock.grammage ?? null,
            thickness: stock.thickness ?? null,
            unitDisplay: stock.unitDisplay ?? stock.stockKind ?? stock.unit ?? null,
            unitStandard: stock.unitStandard ?? stock.yieldUnit ?? stock.unit ?? null,
            conversionFactor: stock.conversionFactor ?? stock.yieldM2 ?? null,
            purchasePrice: stock.unitCost ?? null,
            stockItemId: stock.id,
            stockThreshold: stock.minQty,
            stockLocation: stock.site ?? null,
            source: 'stock-link-auto',
            publicationStatus: 'draft',
            active: true,
            visiblePos: true,
            impactsPrice: true,
            impactsStock: true,
            archived: false,
          } as Parameters<typeof prisma.baseMaterial.create>[0]['data'],
        });
      } else if (material.stockItemId !== stock.id) {
        // Délier l’ancien stock si cette matière pointait ailleurs
        if (material.stockItemId) {
          await tx.stockItem.updateMany({
            where: { id: material.stockItemId, baseMaterialId: material.id },
            data: { baseMaterialId: null } as Record<string, unknown>,
          });
        }
        material = await tx.baseMaterial.update({
          where: { id: material.id },
          data: {
            stockItemId: stock.id,
            // Aligner coût d’achat sur stock (pas seulement le lien)
            ...(stock.unitCost != null ? { purchasePrice: stock.unitCost } : {}),
            label: stock.label || undefined,
          },
        });
      }
      materialIdResolved = material.id;
    } else {
      const material = await tx.baseMaterial.findUnique({ where: { id: materialIdResolved } });
      if (!material) throw new Error('Matière introuvable');
      if (material.stockItemId && material.stockItemId !== stock.id) {
        await tx.stockItem.updateMany({
          where: { id: material.stockItemId, baseMaterialId: material.id },
          data: { baseMaterialId: null } as Record<string, unknown>,
        });
      }
      await tx.baseMaterial.update({
        where: { id: materialIdResolved },
        data: { stockItemId: stock.id },
      });
    }

    // Délier toute autre matière qui pointait vers ce stock
    await tx.baseMaterial.updateMany({
      where: {
        stockItemId: stockItemId,
        id: { not: materialIdResolved },
      },
      data: { stockItemId: null },
    });

    await tx.stockItem.update({
      where: { id: stockItemId },
      data: { baseMaterialId: materialIdResolved } as Record<string, unknown>,
    });

    return { stockItemId, materialId: materialIdResolved! };
  });

  await syncMaterialFromStockItem(stockItemId);
  return result;
}

export async function unlinkStockFromMaterial(stockItemId: string) {
  const raw = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
  if (!raw) throw new Error('Article stock introuvable');
  const stock = asStockExtended(raw);

  await prisma.$transaction(async (tx) => {
    if (stock.baseMaterialId) {
      await tx.baseMaterial.update({
        where: { id: stock.baseMaterialId },
        data: { stockItemId: null },
      });
    }
    await tx.stockItem.update({
      where: { id: stockItemId },
      data: { baseMaterialId: null } as Record<string, unknown>,
    });
  });

  return { stockItemId, unlinked: true };
}

export async function getLinkedMaterialForStock(stockItemId: string) {
  const raw = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
  if (!raw) return null;
  const stock = asStockExtended(raw);
  if (!stock.baseMaterialId) return null;
  return prisma.baseMaterial.findUnique({ where: { id: stock.baseMaterialId } });
}

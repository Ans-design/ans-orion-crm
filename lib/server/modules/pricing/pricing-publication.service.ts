import { prisma } from '@/lib/prisma';

/** Publie toutes les matières de base et prix base en brouillon. */
export async function publishBaseMaterialsPricing(userId?: string): Promise<{
  materialsPublished: number;
  basePrintingPublished: number;
}> {
  const now = new Date();
  const [matRes, printRes] = await Promise.all([
    prisma.baseMaterial.updateMany({
      where: { publicationStatus: 'draft', active: true },
      data: { publicationStatus: 'published', updatedAt: now },
    }),
    prisma.basePrintingPrice.updateMany({
      where: { publicationStatus: 'draft', active: true },
      data: { publicationStatus: 'published', updatedAt: now },
    }),
  ]);

  if (userId) {
    try {
      await prisma.auditLog.create({
        data: {
          action: 'pricing_publish_base_materials',
          entity: 'BaseMaterial',
          entityId: 'bulk',
          userId,
          details: JSON.stringify({
            materialsPublished: matRes.count,
            basePrintingPublished: printRes.count,
          }),
        },
      });
    } catch {
      /* audit best-effort */
    }
  }

  return {
    materialsPublished: matRes.count,
    basePrintingPublished: printRes.count,
  };
}

/** Marque brouillon après modification matière ou prix base. */
export async function markBasePricingDraft(entity: 'material' | 'printing', id: string): Promise<void> {
  if (entity === 'material') {
    await prisma.baseMaterial.update({
      where: { id },
      data: { publicationStatus: 'draft' },
    });
  } else {
    await prisma.basePrintingPrice.update({
      where: { id },
      data: { publicationStatus: 'draft' },
    });
  }
}

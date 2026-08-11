/**
 * Seed Matières de base (tous grammages) + Prix base impression sans finition.
 */
import { PrismaClient } from '@prisma/client';
import { CATALOGUE } from '../lib/data/catalogue';
import { expandAllCatalogMaterials } from '../lib/server/modules/materials/materials-catalog-expander';

const prisma = new PrismaClient();

async function saveBasePrintingRow(data: {
  articleId: string;
  materialKey: string;
  grammage: string;
  formatLabel: string;
  face: string;
  saleUnit: string;
  referenceQty: number;
  basePrice: number;
  maxSafetyPrice: number;
  printCost?: number | null;
  publicationStatus: string;
}) {
  const existing = await prisma.basePrintingPrice.findFirst({
    where: {
      articleId: data.articleId,
      materialKey: data.materialKey,
      grammage: data.grammage,
      formatLabel: data.formatLabel,
      face: data.face,
    },
  });
  if (existing) {
    await prisma.basePrintingPrice.update({
      where: { id: existing.id },
      data: {
        basePrice: data.basePrice,
        maxSafetyPrice: data.maxSafetyPrice,
        publicationStatus: data.publicationStatus,
        saleUnit: data.saleUnit,
        referenceQty: data.referenceQty,
        printCost: data.printCost ?? undefined,
      },
    });
  } else {
    await prisma.basePrintingPrice.create({
      data: { ...data, active: true, materialCost: null },
    });
  }
}

async function seedBaseMaterials() {
  let created = 0;
  let updated = 0;
  const catalog = expandAllCatalogMaterials();

  for (const c of catalog) {
    const materialPrices = await prisma.materialPrice.findMany({
      where: { materialKey: c.materialKey.split(':')[0], active: true },
      take: 1,
    }).catch(() => []);
    const mp = materialPrices[0];

    const existing = await prisma.baseMaterial.findUnique({ where: { materialKey: c.materialKey } });
    if (existing) {
      await prisma.baseMaterial.update({
        where: { id: existing.id },
        data: {
          label: c.label,
          family: c.family,
          grammage: c.grammage,
          normalizedName: c.normalizedName,
          displayName: c.displayName,
          unitDisplay: c.unitDisplay,
          unitStandard: c.unitStandard,
          conversionFactor: c.conversionFactor,
        },
      });
      updated++;
    } else {
      await prisma.baseMaterial.create({
        data: {
          materialKey: c.materialKey,
          label: c.label,
          normalizedName: c.normalizedName,
          displayName: c.displayName,
          family: c.family,
          grammage: c.grammage,
          thickness: c.thickness,
          unitDisplay: c.unitDisplay,
          unitStandard: c.unitStandard,
          conversionFactor: c.conversionFactor,
          saleUnit: c.unitStandard ?? 'feuille',
          aliases: JSON.stringify(c.aliases),
          basePrintPrice: mp?.prixM2 ?? mp?.prixCm2 ?? null,
          purchasePrice: null,
          active: true,
          visiblePos: true,
          impactsPrice: true,
          impactsStock: true,
          source: c.source,
          publicationStatus: 'draft',
        },
      });
      created++;
    }
  }

  console.log(`✅ BaseMaterial sync: ${created} créées, ${updated} mises à jour (${catalog.length} catalogues)`);
}

async function seedBasePrintingPrices() {
  let count = 0;
  for (const item of CATALOGUE) {
    const profile = await prisma.articlePricingProfile.findUnique({
      where: { articleId: item.id },
    }).catch(() => null);

    const prixBase = profile?.prixBase ?? item.prixDepart ?? 1000;
    const pubStatus = profile?.status === 'published' ? 'published' : 'draft';

    const materialPrices = await prisma.materialPrice.findMany({
      where: { articleId: item.id, active: true },
      take: 3,
    }).catch(() => []);

    if (materialPrices.length) {
      for (const mp of materialPrices) {
        const base = mp.prixM2 ?? mp.prixCm2 ?? prixBase;
        await saveBasePrintingRow({
          articleId: item.id,
          materialKey: mp.materialKey ?? '',
          grammage: mp.grammage ?? '',
          formatLabel: '',
          face: 'recto',
          saleUnit: profile?.saleUnit ?? item.unit ?? 'pcs',
          referenceQty: profile?.qtyMin ?? 100,
          basePrice: base,
          maxSafetyPrice: Math.round(base * 1.15),
          printCost: mp.prixM2 ?? mp.prixCm2 ?? null,
          publicationStatus: pubStatus,
        });
        count++;
      }
    } else {
      await saveBasePrintingRow({
        articleId: item.id,
        materialKey: '',
        grammage: '',
        formatLabel: '',
        face: 'recto',
        saleUnit: profile?.saleUnit ?? item.unit ?? 'pcs',
        referenceQty: profile?.qtyMin ?? 100,
        basePrice: prixBase,
        maxSafetyPrice: Math.round(prixBase * 1.15),
        publicationStatus: pubStatus,
      });
      count++;
    }
  }
  console.log(`✅ BasePrintingPrice: ${count} lignes (${CATALOGUE.length} articles)`);
}

async function main() {
  await seedBaseMaterials();
  await seedBasePrintingPrices();

  const [matCount, printCount] = await Promise.all([
    prisma.baseMaterial.count({ where: { archived: false } }),
    prisma.basePrintingPrice.count(),
  ]);
  console.log(`   BaseMaterial actives: ${matCount}`);
  console.log(`   BasePrintingPrice: ${printCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

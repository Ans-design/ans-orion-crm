/**
 * FIN-01 suite 6 — arrondi pré-migration Float→Int (grilles Admin / finance / goodies / GF / packaging).
 * Usage: npx tsx scripts/migrate-money-float-to-int-suite6.ts
 * Puis: npx prisma db push --accept-data-loss
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });
{
  const absDb = resolve(process.cwd(), 'prisma', 'dev.db');
  process.env.DATABASE_URL = `file:${absDb.replace(/\\/g, '/')}`;
}

type Row = Record<string, unknown>;

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const round = (n: unknown) => {
    const v = typeof n === 'number' ? n : Number(n);
    return Number.isFinite(v) ? Math.round(v) : 0;
  };
  const roundOpt = (n: unknown) => (n == null ? null : round(n));

  async function patch(
    label: string,
    findMany: () => Promise<Row[]>,
    sql: (row: Row) => { q: string; args: unknown[] },
  ) {
    const rows = await findMany();
    for (const row of rows) {
      const { q, args } = sql(row);
      await prisma.$executeRawUnsafe(q, ...args);
    }
    console.log(`${label}: ${rows.length}`);
  }

  console.log('═══ Pré-migration suite 6 (arrondi MGA Admin) ═══');

  await patch(
    'DiscountTier',
    () => prisma.discountTier.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE DiscountTier SET unitPrice = ? WHERE id = ?`,
      args: [roundOpt(r.unitPrice), r.id],
    }),
  );

  await patch(
    'MaterialPrice',
    () => prisma.materialPrice.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE MaterialPrice SET prixM2 = ?, prixCm2 = ? WHERE id = ?`,
      args: [roundOpt(r.prixM2), roundOpt(r.prixCm2), r.id],
    }),
  );

  await patch(
    'ProductPricingProfile',
    () => prisma.productPricingProfile.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE ProductPricingProfile SET directPrice = ? WHERE id = ?`,
      args: [roundOpt(r.directPrice), r.id],
    }),
  );

  await patch(
    'BasePrintingPrice',
    () => prisma.basePrintingPrice.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE BasePrintingPrice SET basePrice = ?, maxSafetyPrice = ?, materialCost = ?, printCost = ? WHERE id = ?`,
      args: [
        round(r.basePrice),
        roundOpt(r.maxSafetyPrice),
        roundOpt(r.materialCost),
        roundOpt(r.printCost),
        r.id,
      ],
    }),
  );

  await patch(
    'SalePrice2026',
    () => prisma.salePrice2026.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE SalePrice2026 SET sourcePriceAr = ?, salePriceAr = ? WHERE id = ?`,
      args: [roundOpt(r.sourcePriceAr), roundOpt(r.salePriceAr), r.id],
    }),
  );

  await patch(
    'FinanceCharge',
    () => prisma.financeCharge.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE FinanceCharge SET amount = ? WHERE id = ?`,
      args: [round(r.amount), r.id],
    }),
  );

  await patch(
    'FiscalObligation',
    () => prisma.fiscalObligation.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE FiscalObligation SET montant = ? WHERE id = ?`,
      args: [round(r.montant), r.id],
    }),
  );

  await patch(
    'StockDirectSale',
    () => prisma.stockDirectSale.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE StockDirectSale SET unitPrice = ?, total = ? WHERE id = ?`,
      args: [round(r.unitPrice), round(r.total), r.id],
    }),
  );

  await patch(
    'Equipment',
    () => prisma.equipment.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE Equipment SET prixAchat = ? WHERE id = ?`,
      args: [roundOpt(r.prixAchat), r.id],
    }),
  );

  await patch(
    'MaintenanceTicket',
    () => prisma.maintenanceTicket.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE MaintenanceTicket SET costMGA = ? WHERE id = ?`,
      args: [roundOpt(r.costMGA), r.id],
    }),
  );

  await patch(
    'QualiteControle',
    () => prisma.qualiteControle.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE QualiteControle SET cout = ? WHERE id = ?`,
      args: [roundOpt(r.cout), r.id],
    }),
  );

  await patch(
    'DirectSaleArticle',
    () => prisma.directSaleArticle.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE DirectSaleArticle SET unitPrice = ?, blankUnitPrice = ? WHERE id = ?`,
      args: [round(r.unitPrice), roundOpt(r.blankUnitPrice), r.id],
    }),
  );

  await patch(
    'DirectSalePriceTier',
    () => prisma.directSalePriceTier.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE DirectSalePriceTier SET discountValue = ?, finalUnitPrice = ? WHERE id = ?`,
      args: [round(r.discountValue), roundOpt(r.finalUnitPrice), r.id],
    }),
  );

  await patch(
    'DirectSaleAddon',
    () => prisma.directSaleAddon.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE DirectSaleAddon SET price = ? WHERE id = ?`,
      args: [round(r.price), r.id],
    }),
  );

  await patch(
    'GoodiesArticleModel',
    () => prisma.goodiesArticleModel.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE GoodiesArticleModel SET prixVierge = ? WHERE id = ?`,
      args: [round(r.prixVierge), r.id],
    }),
  );

  await patch(
    'GoodiesPrintingTechnique',
    () => prisma.goodiesPrintingTechnique.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE GoodiesPrintingTechnique SET prixTechnique = ? WHERE id = ?`,
      args: [round(r.prixTechnique), r.id],
    }),
  );

  await patch(
    'GoodiesAddon',
    () => prisma.goodiesAddon.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE GoodiesAddon SET price = ? WHERE id = ?`,
      args: [round(r.price), r.id],
    }),
  );

  await patch(
    'TextileBaseSupportPrice',
    () => prisma.textileBaseSupportPrice.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE TextileBaseSupportPrice SET prixSupportVierge = ? WHERE id = ?`,
      args: [round(r.prixSupportVierge), r.id],
    }),
  );

  await patch(
    'TextileMarkingPrice',
    () => prisma.textileMarkingPrice.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE TextileMarkingPrice SET prixMarquage = ? WHERE id = ?`,
      args: [round(r.prixMarquage), r.id],
    }),
  );

  await patch(
    'TextileLaborPrice',
    () => prisma.textileLaborPrice.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE TextileLaborPrice SET prixLabor = ? WHERE id = ?`,
      args: [round(r.prixLabor), r.id],
    }),
  );

  await patch(
    'TextileDiscountTier',
    () => prisma.textileDiscountTier.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE TextileDiscountTier SET valeurRemise = ? WHERE id = ?`,
      args: [round(r.valeurRemise), r.id],
    }),
  );

  await patch(
    'GrandFormatPricing',
    () => prisma.grandFormatPricing.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE GrandFormatPricing SET basePrice = ?, pricePerM2 = ?, pricePerLinearMeter = ? WHERE id = ?`,
      args: [roundOpt(r.basePrice), roundOpt(r.pricePerM2), roundOpt(r.pricePerLinearMeter), r.id],
    }),
  );

  await patch(
    'GraphicDesignService',
    () => prisma.graphicDesignService.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE GraphicDesignService SET unitPrice = ? WHERE id = ?`,
      args: [round(r.unitPrice), r.id],
    }),
  );

  await patch(
    'PaperBagAccessoryPrice',
    () => prisma.paperBagAccessoryPrice.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE PaperBagAccessoryPrice SET prixHt = ? WHERE id = ?`,
      args: [round(r.prixHt), r.id],
    }),
  );

  await patch(
    'DoypackBlankPrice',
    () => prisma.doypackBlankPrice.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE DoypackBlankPrice SET prixViergeHt = ? WHERE id = ?`,
      args: [round(r.prixViergeHt), r.id],
    }),
  );

  await patch(
    'DoypackPrintRule',
    () => prisma.doypackPrintRule.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE DoypackPrintRule SET prixMinimum = ? WHERE id = ?`,
      args: [round(r.prixMinimum), r.id],
    }),
  );

  await patch(
    'DoypackApplicationRule',
    () => prisma.doypackApplicationRule.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE DoypackApplicationRule SET prixHt = ? WHERE id = ?`,
      args: [round(r.prixHt), r.id],
    }),
  );

  await patch(
    'DoypackLaborRule',
    () => prisma.doypackLaborRule.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE DoypackLaborRule SET prixHt = ? WHERE id = ?`,
      args: [round(r.prixHt), r.id],
    }),
  );

  await patch(
    'PrecutLabelStandardPrice',
    () => prisma.precutLabelStandardPrice.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE PrecutLabelStandardPrice SET prixStandardHt = ? WHERE id = ?`,
      args: [round(r.prixStandardHt), r.id],
    }),
  );

  await patch(
    'CupBlankPrice',
    () => prisma.cupBlankPrice.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE CupBlankPrice SET prixViergeHt = ? WHERE id = ?`,
      args: [round(r.prixViergeHt), r.id],
    }),
  );

  await patch(
    'CupPrintingRule',
    () => prisma.cupPrintingRule.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE CupPrintingRule SET prixHt = ?, prixMinimum = ? WHERE id = ?`,
      args: [round(r.prixHt), round(r.prixMinimum), r.id],
    }),
  );

  await patch(
    'HangtagAccessoryPrice',
    () => prisma.hangtagAccessoryPrice.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE HangtagAccessoryPrice SET prixHt = ? WHERE id = ?`,
      args: [round(r.prixHt), r.id],
    }),
  );

  await patch(
    'PaperFormatRule',
    () => prisma.paperFormatRule.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE PaperFormatRule SET supplementAr = ?, cutAr = ? WHERE id = ?`,
      args: [round(r.supplementAr), round(r.cutAr), r.id],
    }),
  );

  await patch(
    'MaterialPriceEquivalence',
    () => prisma.materialPriceEquivalence.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE MaterialPriceEquivalence SET supplementAr = ? WHERE id = ?`,
      args: [round(r.supplementAr), r.id],
    }),
  );

  await patch(
    'ThickPaperRule',
    () => prisma.thickPaperRule.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE ThickPaperRule SET supplementAr = ? WHERE id = ?`,
      args: [round(r.supplementAr), r.id],
    }),
  );

  await patch(
    'PrintTechnologyRule',
    () => prisma.printTechnologyRule.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE PrintTechnologyRule SET supplementAr = ? WHERE id = ?`,
      args: [round(r.supplementAr), r.id],
    }),
  );

  await patch(
    'ServicePriceEquivalence',
    () => prisma.servicePriceEquivalence.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE ServicePriceEquivalence SET supplementAr = ? WHERE id = ?`,
      args: [round(r.supplementAr), r.id],
    }),
  );

  await patch(
    'CarnetAutocopiantParam',
    () => prisma.carnetAutocopiantParam.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE CarnetAutocopiantParam SET prixA4Nb = ?, prixA4Quadri = ?, numerotationArPerPage = ?, reliureAr = ?, perforationArPerA4 = ?, couverture300gA3RectoAr = ? WHERE id = ?`,
      args: [
        round(r.prixA4Nb),
        round(r.prixA4Quadri),
        round(r.numerotationArPerPage),
        round(r.reliureAr),
        round(r.perforationArPerA4),
        round(r.couverture300gA3RectoAr),
        r.id,
      ],
    }),
  );

  await patch(
    'StampFormatPrice',
    () => prisma.stampFormatPrice.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE StampFormatPrice SET unitPrice = ? WHERE id = ?`,
      args: [round(r.unitPrice), r.id],
    }),
  );

  await patch(
    'PhotobookPricingParam',
    () => prisma.photobookPricingParam.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE PhotobookPricingParam SET prixPageA4 = ?, softCoverSupplement = ?, rigidCoverSupplement = ?, leatherCoverSupplement = ?, customCoverSupplement = ? WHERE id = ?`,
      args: [
        round(r.prixPageA4),
        round(r.softCoverSupplement),
        round(r.rigidCoverSupplement),
        round(r.leatherCoverSupplement),
        round(r.customCoverSupplement),
        r.id,
      ],
    }),
  );

  await patch(
    'TiragePhotoPricingParam',
    () => prisma.tiragePhotoPricingParam.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE TiragePhotoPricingParam SET prixBaseA4 = ? WHERE id = ?`,
      args: [round(r.prixBaseA4), r.id],
    }),
  );

  await patch(
    'BlankFramePrice',
    () => prisma.blankFramePrice.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE BlankFramePrice SET unitPrice = ? WHERE id = ?`,
      args: [round(r.unitPrice), r.id],
    }),
  );

  await patch(
    'CadrePhotoRuleParam',
    () => prisma.cadrePhotoRuleParam.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE CadrePhotoRuleParam SET optionalSupplement = ? WHERE id = ?`,
      args: [round(r.optionalSupplement), r.id],
    }),
  );

  await patch(
    'ArticlePromotionalRule',
    () => prisma.articlePromotionalRule.findMany() as Promise<Row[]>,
    (r) => ({
      q: `UPDATE ArticlePromotionalRule SET discountValue = ? WHERE id = ?`,
      args: [round(r.discountValue), r.id],
    }),
  );

  // Optional models that may exist with different client names
  const optional: Array<[string, () => Promise<Row[]>, (r: Row) => { q: string; args: unknown[] }]> = [];
  const client = prisma as unknown as Record<string, { findMany: () => Promise<Row[]> }>;
  for (const [name, finder, sql] of [
    [
      'PlvItemPrice',
      () => (client.plvItemPrice?.findMany?.() ?? Promise.resolve([])),
      (r: Row) => ({ q: `UPDATE PlvItemPrice SET priceAr = ? WHERE id = ?`, args: [round(r.priceAr), r.id] }),
    ],
    [
      'BadgeTicketParam',
      () => (client.badgeTicketParam?.findMany?.() ?? Promise.resolve([])),
      (r: Row) => ({
        q: `UPDATE BadgeTicketParam SET badgeCutAr = ?, ticketCutAr = ?, ticketQrAr = ? WHERE id = ?`,
        args: [round(r.badgeCutAr), round(r.ticketCutAr), round(r.ticketQrAr), r.id],
      }),
    ],
  ] as Array<[string, () => Promise<Row[]>, (r: Row) => { q: string; args: unknown[] }]>) {
    optional.push([name, finder, sql]);
  }
  for (const [label, finder, sql] of optional) {
    try {
      await patch(label, finder, sql);
    } catch (e) {
      console.log(`${label}: skip (${(e as Error).message?.slice(0, 80)})`);
    }
  }

  await prisma.$disconnect();
  console.log('✅ Arrondi suite 6 terminé — lancer: npx prisma db push --accept-data-loss');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

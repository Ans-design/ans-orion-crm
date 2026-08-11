/**
 * FIN-01 suite 5 — arrondi pré-migration Float→Int (tarifs / stock / caisse / RH / achats).
 * Usage: npx tsx scripts/migrate-money-float-to-int-suite5.ts
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

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const round = (n: unknown) => {
    const v = typeof n === 'number' ? n : Number(n);
    return Number.isFinite(v) ? Math.round(v) : 0;
  };
  const roundOpt = (n: unknown) => {
    if (n == null) return null;
    return round(n);
  };

  console.log('═══ Pré-migration suite 5 (arrondi MGA) ═══');

  const cash = await prisma.cashSession.findMany();
  for (const s of cash) {
    await prisma.$executeRawUnsafe(
      `UPDATE CashSession SET openingFloat = ?, closingCash = ?, expectedCash = ?, variance = ? WHERE id = ?`,
      round(s.openingFloat),
      roundOpt(s.closingCash),
      roundOpt(s.expectedCash),
      roundOpt(s.variance),
      s.id,
    );
  }
  console.log(`CashSession: ${cash.length}`);

  const tarifs = await prisma.tarif.findMany();
  for (const t of tarifs) {
    await prisma.$executeRawUnsafe(
      `UPDATE Tarif SET prixUnitaire = ?, prixBase = ? WHERE id = ?`,
      round(t.prixUnitaire),
      roundOpt(t.prixBase),
      t.id,
    );
  }
  console.log(`Tarif: ${tarifs.length}`);

  const profiles = await prisma.articlePricingProfile.findMany();
  for (const p of profiles) {
    await prisma.$executeRawUnsafe(
      `UPDATE ArticlePricingProfile SET prixBase = ?, prixM2 = ?, prixCm2 = ? WHERE id = ?`,
      roundOpt(p.prixBase),
      roundOpt(p.prixM2),
      roundOpt(p.prixCm2),
      p.id,
    );
  }
  console.log(`ArticlePricingProfile: ${profiles.length}`);

  const mats = await prisma.baseMaterial.findMany();
  for (const m of mats) {
    await prisma.$executeRawUnsafe(
      `UPDATE BaseMaterial SET purchasePrice = ?, blankSellPrice = ?, basePrintPrice = ?, maxPrice = ? WHERE id = ?`,
      roundOpt(m.purchasePrice),
      roundOpt(m.blankSellPrice),
      roundOpt(m.basePrintPrice),
      roundOpt(m.maxPrice),
      m.id,
    );
  }
  console.log(`BaseMaterial: ${mats.length}`);

  const ctx = await prisma.materialContextPrice.findMany();
  for (const c of ctx) {
    await prisma.$executeRawUnsafe(
      `UPDATE MaterialContextPrice SET priceHT = ?, costHT = ? WHERE id = ?`,
      round(c.priceHT),
      roundOpt(c.costHT),
      c.id,
    );
  }
  console.log(`MaterialContextPrice: ${ctx.length}`);

  const stock = await prisma.stockItem.findMany();
  for (const s of stock) {
    await prisma.$executeRawUnsafe(
      `UPDATE StockItem SET unitCost = ?, salePrice = ?, additionalCost = ? WHERE id = ?`,
      roundOpt(s.unitCost),
      roundOpt(s.salePrice),
      roundOpt(s.additionalCost),
      s.id,
    );
  }
  console.log(`StockItem: ${stock.length}`);

  const pos = await prisma.purchaseOrder.findMany();
  for (const o of pos) {
    await prisma.$executeRawUnsafe(`UPDATE PurchaseOrder SET totalHT = ? WHERE id = ?`, round(o.totalHT), o.id);
  }
  console.log(`PurchaseOrder: ${pos.length}`);

  const pol = await prisma.purchaseOrderLine.findMany();
  for (const l of pol) {
    await prisma.$executeRawUnsafe(
      `UPDATE PurchaseOrderLine SET unitCost = ?, total = ? WHERE id = ?`,
      round(l.unitCost),
      round(l.total),
      l.id,
    );
  }
  console.log(`PurchaseOrderLine: ${pol.length}`);

  const emps = await prisma.employee.findMany();
  for (const e of emps) {
    await prisma.$executeRawUnsafe(
      `UPDATE Employee SET salaireBaseMGA = ?, notesFraisMGA = ?, primeMGA = ? WHERE id = ?`,
      round(e.salaireBaseMGA),
      round(e.notesFraisMGA),
      round(e.primeMGA),
      e.id,
    );
  }
  console.log(`Employee: ${emps.length}`);

  const slips = await prisma.payslip.findMany();
  for (const p of slips) {
    await prisma.$executeRawUnsafe(
      `UPDATE Payslip SET brutAmount = ?, netAmount = ? WHERE id = ?`,
      round(p.brutAmount),
      round(p.netAmount),
      p.id,
    );
  }
  console.log(`Payslip: ${slips.length}`);

  const adv = await prisma.employeeAdvance.findMany();
  for (const a of adv) {
    await prisma.$executeRawUnsafe(`UPDATE EmployeeAdvance SET montant = ? WHERE id = ?`, round(a.montant), a.id);
  }
  console.log(`EmployeeAdvance: ${adv.length}`);

  const sup = await prisma.supplierPrice.findMany();
  for (const s of sup) {
    await prisma.$executeRawUnsafe(
      `UPDATE SupplierPrice SET purchasePrice = ?, pricePerYield = ? WHERE id = ?`,
      round(s.purchasePrice),
      roundOpt(s.pricePerYield),
      s.id,
    );
  }
  console.log(`SupplierPrice: ${sup.length}`);

  const fin = await prisma.finishingPrice.findMany();
  for (const f of fin) {
    await prisma.$executeRawUnsafe(
      `UPDATE FinishingPrice SET unitPrice = ? WHERE id = ?`,
      round(f.unitPrice),
      f.id,
    );
  }
  console.log(`FinishingPrice: ${fin.length}`);

  const blank = await prisma.blankMaterialPrice.findMany();
  for (const b of blank) {
    await prisma.$executeRawUnsafe(
      `UPDATE BlankMaterialPrice SET purchasePrice = ? WHERE id = ?`,
      round(b.purchasePrice),
      b.id,
    );
  }
  console.log(`BlankMaterialPrice: ${blank.length}`);

  await prisma.$disconnect();
  console.log('✅ Arrondi suite 5 terminé — lancer: npx prisma db push --accept-data-loss');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

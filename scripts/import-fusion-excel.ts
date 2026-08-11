/**
 * Import fusion métier depuis ANS_ORION_FUSION_METIER_POS_STOCK_PRIX_COMPLET.xlsx
 * Upsert uniquement — ne supprime jamais l'existant.
 */
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { seedOfficialMaterialCatalog } from '../lib/services/material-catalog-service';

/**
 * Chemins portables uniquement — jamais USERPROFILE/Desktop/Downloads.
 * Archive métier : `data/` relatif au dépôt, ou `FUSION_XLSX_PATH` explicite.
 */
function resolveXlsxPath(): string {
  const env = process.env.FUSION_XLSX_PATH?.trim();
  if (env && fs.existsSync(env)) return env;
  const local = path.join(process.cwd(), 'data', 'ANS_ORION_FUSION_METIER_POS_STOCK_PRIX_COMPLET.xlsx');
  if (fs.existsSync(local)) return local;
  const archive = path.join(
    process.cwd(),
    'archives',
    'pricing',
    'ANS_ORION_FUSION_METIER_POS_STOCK_PRIX_COMPLET.xlsx',
  );
  if (fs.existsSync(archive)) return archive;
  throw new Error(
    'Fichier Excel introuvable. Copiez-le vers data/ (ou archives/pricing/) ou définissez FUSION_XLSX_PATH.',
  );
}

function sheetRows(wb: XLSX.WorkBook, name: string): Record<string, string>[] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
}

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 48);
}

function parseNum(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function isManualPrice(type: string, price: number | null, comment: string): boolean {
  const t = `${type} ${comment}`.toLowerCase();
  if (/devis manuel|sur devis|à définir|variable|a definir/.test(t)) return true;
  return price == null || price <= 0;
}

async function importGrandFormatStock(prisma: PrismaClient, wb: XLSX.WorkBook) {
  const rows = sheetRows(wb, '05_Stock_GF');
  let n = 0;
  for (const r of rows) {
    const label = String(r['Article normalisé'] || r['Article brut'] || '').trim();
    if (!label) continue;
    const lengthM = parseNum(r['Longueur m normalisée']);
    const widthM = parseNum(r['Largeur m normalisée']);
    const yieldM2 = parseNum(r['Rendement calculé']) ?? parseNum(r['Rendement source']);
    const grammage = String(r['Grammage'] || '').trim();
    const sku = `GF-${slug(label)}`;
    await prisma.stockItem.upsert({
      where: { sku },
      update: {
        label,
        category: 'GrandFormat',
        materialKey: label,
        stockKind: String(r['Unité achat'] || 'rouleau').toLowerCase().includes('plaque') ? 'plaque' : 'rouleau',
        lengthM: lengthM ?? undefined,
        widthM: widthM ?? undefined,
        yieldM2: yieldM2 ?? undefined,
        yieldUnit: 'm2',
        grammage: grammage || undefined,
        unit: 'm²',
        actif: true,
        pricingMode: 'auto',
      },
      create: {
        sku,
        label,
        category: 'GrandFormat',
        materialKey: label,
        stockKind: 'rouleau',
        lengthM: lengthM ?? undefined,
        widthM: widthM ?? undefined,
        yieldM2: yieldM2 ?? undefined,
        yieldUnit: 'm2',
        grammage: grammage || undefined,
        unit: 'm²',
        quantity: yieldM2 ?? 100,
        minQty: 10,
        actif: true,
        pricingMode: 'auto',
      },
    });
    n++;
  }
  return n;
}

async function importSupplierPrices(prisma: PrismaClient, wb: XLSX.WorkBook) {
  const rows = sheetRows(wb, '06_Prix_Achat_Fournisseurs');
  let n = 0;
  for (const r of rows) {
    const articleNormalized = String(r['Article normalisé'] || '').trim();
    const supplierName = String(r['Fournisseur'] || '').trim();
    const purchasePrice = parseNum(r['Prix achat']);
    if (!articleNormalized || !supplierName || purchasePrice == null) continue;

    const stock = await prisma.stockItem.findFirst({
      where: { OR: [{ materialKey: articleNormalized }, { label: articleNormalized }] },
    });

    const existing = await prisma.supplierPrice.findFirst({
      where: { supplierName, articleNormalized, purchasePrice, actif: true },
    });
    if (existing) continue;

    await prisma.supplierPrice.create({
      data: {
        supplierName,
        articleRaw: String(r['Article brut'] || '') || null,
        articleNormalized,
        specification: String(r['Spécification'] || '') || null,
        purchasePrice,
        yieldLinked: parseNum(r['Rendement lié']) ?? undefined,
        yieldUnit: String(r['Par rendement'] || '') || null,
        pricePerYield: parseNum(r['Prix / rendement']) ?? undefined,
        unitPurchase: String(r['Source table'] || '') || null,
        observation: String(r['Observation'] || '') || null,
        stockItemId: stock?.id ?? null,
        actif: true,
      },
    });
    n++;
  }
  return n;
}

async function upsertSalePriceRow(
  prisma: PrismaClient,
  data: Parameters<typeof prisma.salePrice2026.create>[0]['data'],
) {
  const importedPrice = data.salePriceAr ?? null;
  const existing = await prisma.salePrice2026.findUnique({
    where: { sourceId: data.sourceId! },
  });

  const meta = {
    familyPos: data.familyPos,
    productNormalized: data.productNormalized,
    section: data.section,
    format: data.format,
    dimensions: data.dimensions,
    material: data.material,
    grammage: data.grammage,
    technology: data.technology,
    face: data.face,
    qtyTier: data.qtyTier,
    priceType: data.priceType,
    comment: data.comment,
    posStatus: data.posStatus,
    sourcePriceAr: importedPrice ?? undefined,
    updatedAt: new Date(),
  };

  if (!existing) {
    await prisma.salePrice2026.create({
      data: {
        ...data,
        sourcePriceAr: importedPrice ?? undefined,
        adminModified: false,
      },
    });
    return;
  }

  if (existing.adminModified) {
    await prisma.salePrice2026.update({
      where: { sourceId: data.sourceId! },
      data: {
        ...meta,
        salePriceAr: existing.salePriceAr,
        actif: existing.actif,
      },
    });
  } else {
    await prisma.salePrice2026.update({
      where: { sourceId: data.sourceId! },
      data: {
        ...meta,
        salePriceAr: importedPrice ?? undefined,
        actif: data.actif,
        adminModified: false,
      },
    });
  }
}

async function importSalePrices2026(prisma: PrismaClient, wb: XLSX.WorkBook) {
  const rows = sheetRows(wb, '02_Prix_Vente_2026');
  let n = 0;
  const batch: Array<Parameters<typeof prisma.salePrice2026.create>[0]['data']> = [];

  for (const r of rows) {
    const sourceId = String(r['ID'] || '').trim();
    const productNormalized = String(r['Produit normalisé'] || '').trim();
    if (!sourceId || !productNormalized) continue;

    const salePriceAr = parseNum(r['Prix vente final Ar']);
    const priceType = String(r['Type prix'] || '');
    const comment = String(r['Commentaire / règle'] || '');
    const manual = isManualPrice(priceType, salePriceAr, comment);

    batch.push({
      sourceId,
      familyPos: String(r['Famille POS'] || '') || null,
      productNormalized,
      section: String(r['Section / variante'] || '') || null,
      format: String(r['Format'] || '') || null,
      dimensions: String(r['Dimensions'] || '') || null,
      material: String(r['Matière / support'] || '') || null,
      grammage: String(r['Grammage / épaisseur'] || '') || null,
      technology: String(r['Technologie'] || '') || null,
      face: String(r['Face'] || '') || null,
      qtyTier: String(r['Quantité / palier'] || '') || null,
      salePriceAr: salePriceAr ?? undefined,
      priceType: manual ? 'manual' : 'auto',
      comment: comment || null,
      posStatus: String(r['Statut POS conseillé'] || 'active'),
      actif: !manual,
    });
    n++;

    if (batch.length >= 200) {
      for (const data of batch) {
        await upsertSalePriceRow(prisma, data);
      }
      batch.length = 0;
    }
  }

  for (const data of batch) {
    await upsertSalePriceRow(prisma, data);
  }
  return n;
}

async function importAnomalies(prisma: PrismaClient, wb: XLSX.WorkBook) {
  const rows = sheetRows(wb, '09_Anomalies_Decisions');
  let n = 0;
  for (const r of rows) {
    const message = String(
      r['Anomalie / point'] || r['Anomalie'] || r['Message'] || Object.values(r)[0] || '',
    ).trim();
    if (!message || message.length < 5) continue;
    const ref = String(r['Référence'] || r['ID'] || r['Produit'] || '').trim() || null;
    const exists = await prisma.importAnomaly.findFirst({
      where: { sheet: '09_Anomalies_Decisions', message },
    });
    if (exists) continue;
    await prisma.importAnomaly.create({
      data: {
        sheet: '09_Anomalies_Decisions',
        ref,
        severity: String(r['Priorité'] || r['Sévérité'] || 'warning'),
        message,
        decision: String(r['Décision'] || r['Action'] || '') || null,
      },
    });
    n++;
  }
  return n;
}

async function linkSupplierCostsToStock(prisma: PrismaClient) {
  const prices = await prisma.supplierPrice.findMany({
    where: { actif: true, stockItemId: { not: null } },
  });
  const byStock = new Map<string, { min: number; supplier: string }>();
  for (const p of prices) {
    if (!p.stockItemId) continue;
    const cur = byStock.get(p.stockItemId);
    if (!cur || p.purchasePrice < cur.min) {
      byStock.set(p.stockItemId, { min: p.purchasePrice, supplier: p.supplierName });
    }
  }
  for (const [stockItemId, { min, supplier }] of byStock) {
    const item = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
    if (!item) continue;
    const costPerM2 = item.yieldM2 && item.yieldM2 > 0 ? min / item.yieldM2 : undefined;
    await prisma.stockItem.update({
      where: { id: stockItemId },
      data: {
        unitCost: costPerM2 ?? item.unitCost ?? min,
        supplier: item.supplier || supplier,
      },
    });
  }
}

export async function runFusionImport(prisma: PrismaClient, xlsxPath?: string) {
  const file = xlsxPath || resolveXlsxPath();
  console.log(`📂 Import fusion: ${file}`);
  const wb = XLSX.readFile(file);

  const materials = await seedOfficialMaterialCatalog();
  console.log(`  ✓ ${materials} matières/grammages officiels`);

  const gf = await importGrandFormatStock(prisma, wb);
  console.log(`  ✓ ${gf} articles stock grand format`);

  const suppliers = await importSupplierPrices(prisma, wb);
  console.log(`  ✓ ${suppliers} prix achat fournisseurs`);

  const sales = await importSalePrices2026(prisma, wb);
  console.log(`  ✓ ${sales} lignes prix vente PRIX 2026`);

  const anomalies = await importAnomalies(prisma, wb);
  console.log(`  ✓ ${anomalies} anomalies import`);

  await linkSupplierCostsToStock(prisma);
  console.log('  ✓ coûts matière liés au stock GF');

  return { materials, gf, suppliers, sales, anomalies };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await runFusionImport(prisma);
    console.log('\n✅ Import fusion terminé (upsert — rien supprimé).');
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').includes('import-fusion-excel');
if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

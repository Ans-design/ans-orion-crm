import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { formatExcelRowId } from '@/lib/backoffice/material-main-reference';
import {
  parseFinishingExcelRow,
  parseGrandFormatExcelRow,
  parseDesignExcelRow,
  finishingToExcelRow,
  grandFormatToExcelRow,
  designToExcelRow,
  type ImportReport,
} from '@/lib/backoffice/pricing-tables-excel-format';
import {
  syncFinishingPriceToPos,
  syncGrandFormatPricingToPos,
  syncGraphicDesignServiceToPos,
} from '@/lib/services/direct-sale-pos-sync.service';

function emptyReport(read: number): ImportReport {
  return { read, created: 0, updated: 0, errors: 0, synced: 0, issues: [] };
}

async function findByExcelOrName<T extends { id: string }>(
  model: { findFirst: (args: object) => Promise<T | null> },
  excelId: string | null,
  name: string,
  nameField: string,
) {
  if (excelId) {
    const byExcel = await model.findFirst({ where: { excelId } });
    if (byExcel) return byExcel;
  }
  return model.findFirst({ where: { [nameField]: name } });
}

// ─── Finitions ─────────────────────────────────────────────────────────────

export async function listFinishingPrices() {
  return prisma.finishingPrice.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
}

export async function importFinishingFromExcel(
  rows: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string },
): Promise<ImportReport> {
  const report = emptyReport(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const parsed = parseFinishingExcelRow(rows[i]!, line);
    if ('error' in parsed) {
      report.errors++;
      report.issues.push({ line, reason: parsed.error ?? 'Erreur ligne' });
      continue;
    }
    const data = parsed.row;
    try {
      const existing = await findByExcelOrName(prisma.finishingPrice, data.excelId, data.name, 'name');
      const excelId = data.excelId ?? existing?.excelId ?? formatExcelRowId(i + 1);
      let id: string;
      if (existing) {
        await prisma.finishingPrice.update({ where: { id: existing.id }, data: { ...data, excelId } });
        id = existing.id;
        report.updated++;
      } else {
        const created = await prisma.finishingPrice.create({ data: { ...data, excelId } });
        id = created.id;
        report.created++;
      }
      if (data.status === 'published' && data.active) {
        await syncFinishingPriceToPos(id, opts);
        report.synced++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  await logAudit({ userId: opts?.userId, userName: opts?.userName, action: 'IMPORT', entity: 'FinishingPrice', details: report });
  return report;
}

export async function exportFinishingToExcel() {
  const rows = await listFinishingPrices();
  return rows.map((r) => finishingToExcelRow(r));
}

export async function syncAllFinishingToPos(opts?: { userId?: string; userName?: string }) {
  const rows = await prisma.finishingPrice.findMany({
    where: { active: true, status: 'published' },
    select: { id: true },
  });
  let synced = 0;
  for (const r of rows) {
    if (await syncFinishingPriceToPos(r.id, opts)) synced++;
  }
  return { synced };
}

// ─── Grand format ──────────────────────────────────────────────────────────

export async function listGrandFormatPricing(opts?: { includeArchived?: boolean }) {
  return prisma.grandFormatPricing.findMany({
    where: opts?.includeArchived
      ? undefined
      : { NOT: { status: 'archived' } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function importGrandFormatFromExcel(
  rows: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string },
): Promise<ImportReport> {
  const report = emptyReport(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const parsed = parseGrandFormatExcelRow(rows[i]!, line);
    if ('error' in parsed) {
      report.errors++;
      report.issues.push({ line, reason: parsed.error ?? 'Erreur ligne' });
      continue;
    }
    const data = parsed.row;
    try {
      const existing = await findByExcelOrName(prisma.grandFormatPricing, data.excelId, data.name, 'name');
      const excelId = data.excelId ?? existing?.excelId ?? formatExcelRowId(i + 1);
      let id: string;
      if (existing) {
        await prisma.grandFormatPricing.update({ where: { id: existing.id }, data: { ...data, excelId } });
        id = existing.id;
        report.updated++;
      } else {
        const created = await prisma.grandFormatPricing.create({ data: { ...data, excelId } });
        id = created.id;
        report.created++;
      }
      if (data.status === 'published' && data.active) {
        await syncGrandFormatPricingToPos(id, opts);
        report.synced++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  await logAudit({ userId: opts?.userId, userName: opts?.userName, action: 'IMPORT', entity: 'GrandFormatPricing', details: report });
  return report;
}

export async function exportGrandFormatToExcel() {
  const rows = await listGrandFormatPricing();
  return rows.map((r) => grandFormatToExcelRow(r));
}

export async function syncAllGrandFormatToPos(opts?: { userId?: string; userName?: string }) {
  const rows = await prisma.grandFormatPricing.findMany({
    where: { active: true, status: 'published' },
    select: { id: true },
  });
  let synced = 0;
  for (const r of rows) {
    if (await syncGrandFormatPricingToPos(r.id, opts)) synced++;
  }
  return { synced };
}

// ─── Design ────────────────────────────────────────────────────────────────

export async function listGraphicDesignServices() {
  return prisma.graphicDesignService.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
}

export async function importDesignFromExcel(
  rows: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string },
): Promise<ImportReport> {
  const report = emptyReport(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const parsed = parseDesignExcelRow(rows[i]!, line);
    if ('error' in parsed) {
      report.errors++;
      report.issues.push({ line, reason: parsed.error ?? 'Erreur ligne' });
      continue;
    }
    const data = parsed.row;
    try {
      const existing = await findByExcelOrName(prisma.graphicDesignService, data.excelId, data.name, 'name');
      const excelId = data.excelId ?? existing?.excelId ?? formatExcelRowId(i + 1);
      let id: string;
      if (existing) {
        await prisma.graphicDesignService.update({ where: { id: existing.id }, data: { ...data, excelId } });
        id = existing.id;
        report.updated++;
      } else {
        const created = await prisma.graphicDesignService.create({ data: { ...data, excelId } });
        id = created.id;
        report.created++;
      }
      if (data.status === 'published' && data.active) {
        await syncGraphicDesignServiceToPos(id, opts);
        report.synced++;
      }
    } catch (e) {
      report.errors++;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur' });
    }
  }
  await logAudit({ userId: opts?.userId, userName: opts?.userName, action: 'IMPORT', entity: 'GraphicDesignService', details: report });
  return report;
}

export async function exportDesignToExcel() {
  const rows = await listGraphicDesignServices();
  return rows.map((r) => designToExcelRow(r));
}

export async function syncAllDesignToPos(opts?: { userId?: string; userName?: string }) {
  const rows = await prisma.graphicDesignService.findMany({
    where: { active: true, status: 'published' },
    select: { id: true },
  });
  let synced = 0;
  for (const r of rows) {
    if (await syncGraphicDesignServiceToPos(r.id, opts)) synced++;
  }
  return { synced };
}

/** Sync global : vente directe + finitions + GF + design + réparation catégories */
export async function syncAllDirectSalePricingToPos(opts?: { userId?: string; userName?: string }) {
  const { syncAllPublishedDirectSaleToPos } = await import('@/lib/server/modules/direct-sale/direct-sale.service');
  const [ds, fin, gf, design] = await Promise.all([
    syncAllPublishedDirectSaleToPos(opts),
    syncAllFinishingToPos(opts),
    syncAllGrandFormatToPos(opts),
    syncAllDesignToPos(opts),
  ]);

  let mergeGf = { profilesArchived: 0, profilesReassigned: 0 };
  let repair = { repaired: 0 };
  try {
    const { mergeGrandFormatArticles } = await import(
      '@/lib/services/merge-grand-format-articles.service'
    );
    mergeGf = await mergeGrandFormatArticles(opts);
  } catch {
    /* ignore */
  }
  try {
    const { repairMisclassifiedPosCategories } = await import(
      '@/lib/services/pos-category-repair.service'
    );
    repair = await repairMisclassifiedPosCategories();
  } catch {
    /* ignore */
  }

  let plvPrices = { synced: 0, overrides: 0 };
  try {
    const { syncPlvDirectSalePricesToCanonical, invalidatePlvDirectSalePriceCache } = await import(
      '@/lib/services/plv-direct-sale-price-sync.service'
    );
    invalidatePlvDirectSalePriceCache();
    plvPrices = await syncPlvDirectSalePricesToCanonical(opts);
  } catch {
    /* ignore */
  }

    let dsMerge = { archived: 0, prixUpdated: 0 };
  try {
    const { mergeRedundantDirectSalePosCards } = await import(
      '@/lib/services/merge-direct-sale-pos.service'
    );
    dsMerge = await mergeRedundantDirectSalePosCards(opts);
  } catch {
    /* ignore */
  }

  let persoMerge = { archived: 0 };
  try {
    const { mergePersonalizedDuplicateArticles } = await import(
      '@/lib/services/merge-personalized-articles.service'
    );
    persoMerge = await mergePersonalizedDuplicateArticles(opts);
  } catch {
    /* ignore */
  }

  let variantMerge = { archived: 0 };
  try {
    const { mergeVariantPosCards } = await import(
      '@/lib/services/merge-variant-pos-cards.service'
    );
    variantMerge = await mergeVariantPosCards(opts);
  } catch {
    /* ignore */
  }

  let goodiesSync = { modelsSynced: 0, techniquesSynced: 0 };
  try {
    const { syncArticleOptionsToPOS } = await import(
      '@/lib/services/catalog-options-sync.service'
    );
    goodiesSync = await syncArticleOptionsToPOS(undefined, opts);
  } catch {
    /* ignore */
  }

  return {
    directSale: ds.synced,
    finishing: fin.synced,
    grandFormat: gf.synced,
    design: design.synced,
    categoriesRepaired: repair.repaired,
    gfMerged: mergeGf.profilesArchived + mergeGf.profilesReassigned,
    plvPricesSynced: plvPrices.synced,
    plvPriceOverrides: plvPrices.overrides,
    dsPosMerged: dsMerge.archived,
    personalizedMerged: persoMerge.archived,
    variantCardsMerged: variantMerge.archived,
    goodiesModelsSynced: goodiesSync.modelsSynced,
    goodiesTechniquesSynced: goodiesSync.techniquesSynced,
    total: ds.synced + fin.synced + gf.synced + design.synced,
  };
}

/**
 * CRUD + import/export Textile Admin + sync POS.
 */
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import {
  parseTextileSupportExcelRow,
  parseTextileMarkingExcelRow,
  parseTextileLaborExcelRow,
  parseTextileRuleExcelRow,
  parseTextileTierExcelRow,
  textileSupportToExcelRow,
  textileMarkingToExcelRow,
  textileLaborToExcelRow,
  textileRuleToExcelRow,
  textileTierToExcelRow,
  TEXTILE_SUPPORTS_COLUMNS,
  TEXTILE_MARKING_COLUMNS,
  TEXTILE_LABOR_COLUMNS,
  TEXTILE_RULES_COLUMNS,
  TEXTILE_TIERS_COLUMNS,
} from '@/lib/backoffice/textile-excel-format';
import { syncTextileAdminToPos } from '@/lib/services/textile-admin-sync.service';

export type TextileTableKind = 'supports' | 'markings' | 'labors' | 'rules' | 'tiers';

export async function listTextileRows(kind: TextileTableKind, trash = false) {
  const where = trash ? { deletedAt: { not: null } } : { deletedAt: null };
  if (kind === 'supports') {
    return prisma.textileBaseSupportPrice.findMany({
      where,
      orderBy: [{ articleId: 'asc' }, { matiere: 'asc' }, { taille: 'asc' }],
    });
  }
  if (kind === 'markings') {
    return prisma.textileMarkingPrice.findMany({
      where,
      orderBy: [{ technique: 'asc' }, { tailleMarquage: 'asc' }],
    });
  }
  if (kind === 'labors') {
    return prisma.textileLaborPrice.findMany({
      where,
      orderBy: [{ typeLabor: 'asc' }],
    });
  }
  if (kind === 'rules') {
    return prisma.textilePricingRule.findMany({
      where,
      orderBy: [{ articleId: 'asc' }],
    });
  }
  return prisma.textileDiscountTier.findMany({
    where,
    orderBy: [{ articleId: 'asc' }, { qtyMin: 'asc' }],
  });
}

export function exportTextileExcelRows(kind: TextileTableKind, rows: Awaited<ReturnType<typeof listTextileRows>>) {
  if (kind === 'supports') return rows.map((r) => textileSupportToExcelRow(r as Parameters<typeof textileSupportToExcelRow>[0]));
  if (kind === 'markings') return rows.map((r) => textileMarkingToExcelRow(r as Parameters<typeof textileMarkingToExcelRow>[0]));
  if (kind === 'labors') return rows.map((r) => textileLaborToExcelRow(r as Parameters<typeof textileLaborToExcelRow>[0]));
  if (kind === 'rules') return rows.map((r) => textileRuleToExcelRow(r as Parameters<typeof textileRuleToExcelRow>[0]));
  return rows.map((r) => textileTierToExcelRow(r as Parameters<typeof textileTierToExcelRow>[0]));
}

export function columnsForTextileKind(kind: TextileTableKind) {
  if (kind === 'supports') return TEXTILE_SUPPORTS_COLUMNS;
  if (kind === 'markings') return TEXTILE_MARKING_COLUMNS;
  if (kind === 'labors') return TEXTILE_LABOR_COLUMNS;
  if (kind === 'rules') return TEXTILE_RULES_COLUMNS;
  return TEXTILE_TIERS_COLUMNS;
}

export function priceKeyForTextileKind(kind: TextileTableKind) {
  if (kind === 'supports') return 'prixSupportVierge';
  if (kind === 'markings') return 'prixMarquage';
  if (kind === 'labors') return 'prixLabor';
  if (kind === 'tiers') return 'valeurRemise';
  return 'formula';
}

async function findByExcel(
  model: { findFirst: (args: { where: Record<string, unknown> }) => Promise<{ id: string } | null> },
  excelId: string | null,
) {
  if (!excelId) return null;
  return model.findFirst({ where: { excelId } });
}

export async function importTextileExcel(
  kind: TextileTableKind,
  rawRows: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string },
) {
  const report = { read: rawRows.length, created: 0, updated: 0, errors: [] as string[], synced: 0 };
  const touched = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const line = i + 2;
    try {
      if (kind === 'supports') {
        const parsed = parseTextileSupportExcelRow(rawRows[i]!, line);
        if ('error' in parsed) {
          report.errors.push(String(parsed.error));
          continue;
        }
        const data = parsed.row;
        if (data.prixSupportVierge < 0) {
          report.errors.push(`Ligne ${line} : prix négatif`);
          continue;
        }
        const existing = (await findByExcel(prisma.textileBaseSupportPrice, data.excelId))
          ?? (await prisma.textileBaseSupportPrice.findFirst({
            where: {
              articleId: data.articleId,
              matiere: data.matiere,
              taille: data.taille,
              deletedAt: null,
            },
          }));
        if (existing) {
          await prisma.textileBaseSupportPrice.update({
            where: { id: existing.id },
            data: { ...data, deletedAt: null, updatedAt: new Date() },
          });
          report.updated++;
        } else {
          await prisma.textileBaseSupportPrice.create({ data });
          report.created++;
        }
        touched.add(data.articleId);
      } else if (kind === 'markings') {
        const parsed = parseTextileMarkingExcelRow(rawRows[i]!, line);
        if ('error' in parsed) {
          report.errors.push(String(parsed.error));
          continue;
        }
        const data = parsed.row;
        const existing = (await findByExcel(prisma.textileMarkingPrice, data.excelId))
          ?? (await prisma.textileMarkingPrice.findFirst({
            where: {
              technique: data.technique,
              tailleMarquage: data.tailleMarquage,
              deletedAt: null,
            },
          }));
        if (existing) {
          await prisma.textileMarkingPrice.update({
            where: { id: existing.id },
            data: { ...data, deletedAt: null, updatedAt: new Date() },
          });
          report.updated++;
        } else {
          await prisma.textileMarkingPrice.create({ data });
          report.created++;
        }
        touched.add('*');
      } else if (kind === 'labors') {
        const parsed = parseTextileLaborExcelRow(rawRows[i]!, line);
        if ('error' in parsed) {
          report.errors.push(String(parsed.error));
          continue;
        }
        const data = parsed.row;
        const existing = (await findByExcel(prisma.textileLaborPrice, data.excelId))
          ?? (await prisma.textileLaborPrice.findFirst({
            where: { typeLabor: data.typeLabor, articleId: data.articleId, deletedAt: null },
          }));
        if (existing) {
          await prisma.textileLaborPrice.update({
            where: { id: existing.id },
            data: { ...data, deletedAt: null, updatedAt: new Date() },
          });
          report.updated++;
        } else {
          await prisma.textileLaborPrice.create({ data });
          report.created++;
        }
        touched.add(data.articleId);
      } else if (kind === 'rules') {
        const parsed = parseTextileRuleExcelRow(rawRows[i]!, line);
        if ('error' in parsed) {
          report.errors.push(String(parsed.error));
          continue;
        }
        const data = parsed.row;
        const existing = (await findByExcel(prisma.textilePricingRule, data.excelId))
          ?? (await prisma.textilePricingRule.findFirst({ where: { articleId: data.articleId } }));
        if (existing) {
          await prisma.textilePricingRule.update({
            where: { id: existing.id },
            data: { ...data, deletedAt: null, updatedAt: new Date() },
          });
          report.updated++;
        } else {
          await prisma.textilePricingRule.create({ data });
          report.created++;
        }
        touched.add(data.articleId);
      } else {
        const parsed = parseTextileTierExcelRow(rawRows[i]!, line);
        if ('error' in parsed) {
          report.errors.push(String(parsed.error));
          continue;
        }
        const data = parsed.row;
        if (data.qtyMax != null && data.qtyMax < data.qtyMin) {
          report.errors.push(`Ligne ${line} : palier incohérent (max < min)`);
          continue;
        }
        const existing = (await findByExcel(prisma.textileDiscountTier, data.excelId))
          ?? (await prisma.textileDiscountTier.findFirst({
            where: { articleId: data.articleId, qtyMin: data.qtyMin, deletedAt: null },
          }));
        if (existing) {
          await prisma.textileDiscountTier.update({
            where: { id: existing.id },
            data: { ...data, deletedAt: null, updatedAt: new Date() },
          });
          report.updated++;
        } else {
          await prisma.textileDiscountTier.create({ data });
          report.created++;
        }
        touched.add(data.articleId);
      }
    } catch (e) {
      report.errors.push(`Ligne ${line}: ${e instanceof Error ? e.message : 'erreur'}`);
    }
  }

  for (const aid of touched) {
    if (aid === '*') continue;
    await syncTextileAdminToPos(aid, opts);
    report.synced++;
  }
  if (touched.has('*')) {
    await syncTextileAdminToPos(null, opts);
    report.synced++;
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT',
    entity: `Textile:${kind}`,
    details: report,
  });

  return report;
}

export async function softDeleteTextileRow(
  kind: TextileTableKind,
  id: string,
  opts?: { userId?: string; userName?: string },
) {
  const now = new Date();
  let articleId = '';
  if (kind === 'supports') {
    const r = await prisma.textileBaseSupportPrice.update({
      where: { id },
      data: { deletedAt: now, active: false, status: 'archived', visiblePOS: false },
    });
    articleId = r.articleId;
  } else if (kind === 'markings') {
    await prisma.textileMarkingPrice.update({
      where: { id },
      data: { deletedAt: now, active: false, status: 'archived', visiblePOS: false },
    });
  } else if (kind === 'labors') {
    const r = await prisma.textileLaborPrice.update({
      where: { id },
      data: { deletedAt: now, active: false, status: 'archived', visiblePOS: false },
    });
    articleId = r.articleId;
  } else if (kind === 'rules') {
    const r = await prisma.textilePricingRule.update({
      where: { id },
      data: { deletedAt: now, active: false, status: 'archived', visiblePOS: false },
    });
    articleId = r.articleId;
  } else {
    const r = await prisma.textileDiscountTier.update({
      where: { id },
      data: { deletedAt: now, active: false, status: 'archived' },
    });
    articleId = r.articleId;
  }
  if (articleId && articleId !== '*') await syncTextileAdminToPos(articleId, opts);
  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'ARCHIVE',
    entity: `Textile:${kind}`,
    entityId: id,
  });
  return { ok: true, articleId };
}

export async function restoreTextileRow(
  kind: TextileTableKind,
  id: string,
  opts?: { userId?: string; userName?: string },
) {
  let articleId = '';
  const data = { deletedAt: null, active: true, status: 'published', visiblePOS: true };
  if (kind === 'supports') {
    const r = await prisma.textileBaseSupportPrice.update({ where: { id }, data });
    articleId = r.articleId;
  } else if (kind === 'markings') {
    await prisma.textileMarkingPrice.update({ where: { id }, data });
  } else if (kind === 'labors') {
    const r = await prisma.textileLaborPrice.update({ where: { id }, data });
    articleId = r.articleId;
  } else if (kind === 'rules') {
    const r = await prisma.textilePricingRule.update({ where: { id }, data });
    articleId = r.articleId;
  } else {
    const r = await prisma.textileDiscountTier.update({
      where: { id },
      data: { deletedAt: null, active: true, status: 'published' },
    });
    articleId = r.articleId;
  }
  if (articleId && articleId !== '*') await syncTextileAdminToPos(articleId, opts);
  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'RESTORE',
    entity: `Textile:${kind}`,
    entityId: id,
  });
  return { ok: true, articleId };
}

export async function patchTextileRow(
  kind: TextileTableKind,
  id: string,
  body: Record<string, unknown>,
  opts?: { userId?: string; userName?: string },
) {
  let articleId = '';
  if (kind === 'supports') {
    const data: Record<string, unknown> = {};
    if (body.prixSupportVierge != null) data.prixSupportVierge = Number(body.prixSupportVierge);
    if (body.matiere != null) data.matiere = String(body.matiere);
    if (body.taille != null) data.taille = String(body.taille);
    if (body.visiblePOS != null) data.visiblePOS = Boolean(body.visiblePOS);
    if (body.active != null) data.active = Boolean(body.active);
    if (body.status != null) data.status = String(body.status);
    const r = await prisma.textileBaseSupportPrice.update({ where: { id }, data });
    articleId = r.articleId;
  } else if (kind === 'markings') {
    const data: Record<string, unknown> = {};
    if (body.prixMarquage != null) data.prixMarquage = Number(body.prixMarquage);
    if (body.technique != null) data.technique = String(body.technique);
    if (body.visiblePOS != null) data.visiblePOS = Boolean(body.visiblePOS);
    if (body.active != null) data.active = Boolean(body.active);
    await prisma.textileMarkingPrice.update({ where: { id }, data });
  } else if (kind === 'labors') {
    const data: Record<string, unknown> = {};
    if (body.prixLabor != null) data.prixLabor = Number(body.prixLabor);
    if (body.typeLabor != null) data.typeLabor = String(body.typeLabor);
    if (body.visiblePOS != null) data.visiblePOS = Boolean(body.visiblePOS);
    const r = await prisma.textileLaborPrice.update({ where: { id }, data });
    articleId = r.articleId;
  } else if (kind === 'rules') {
    const data: Record<string, unknown> = {};
    if (body.formula != null) data.formula = String(body.formula);
    if (body.typeCalcul != null) data.typeCalcul = String(body.typeCalcul);
    if (body.status != null) data.status = String(body.status);
    const r = await prisma.textilePricingRule.update({ where: { id }, data });
    articleId = r.articleId;
  } else {
    const data: Record<string, unknown> = {};
    if (body.valeurRemise != null) data.valeurRemise = Number(body.valeurRemise);
    if (body.qtyMin != null) data.qtyMin = Number(body.qtyMin);
    if (body.qtyMax !== undefined) data.qtyMax = body.qtyMax == null ? null : Number(body.qtyMax);
    const r = await prisma.textileDiscountTier.update({ where: { id }, data });
    articleId = r.articleId;
  }

  if (body.action === 'sync' || body.action === 'publish') {
    await syncTextileAdminToPos(articleId || null, opts);
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'UPDATE',
    entity: `Textile:${kind}`,
    entityId: id,
    details: body,
  });

  return { ok: true, articleId };
}

export async function exportTextileWorkbook() {
  const [supports, markings, labors, rules, tiers] = await Promise.all([
    listTextileRows('supports'),
    listTextileRows('markings'),
    listTextileRows('labors'),
    listTextileRows('rules'),
    listTextileRows('tiers'),
  ]);
  return {
    supports: exportTextileExcelRows('supports', supports),
    markings: exportTextileExcelRows('markings', markings),
    labors: exportTextileExcelRows('labors', labors),
    rules: exportTextileExcelRows('rules', rules),
    tiers: exportTextileExcelRows('tiers', tiers),
  };
}

export async function importTextileWorkbook(
  sheets: Record<string, Record<string, unknown>[]>,
  opts?: { userId?: string; userName?: string },
) {
  const map: Array<{ key: string; kind: TextileTableKind }> = [
    { key: '01_SUPPORTS_TEXTILES', kind: 'supports' },
    { key: '02_MARQUAGE_TEXTILE', kind: 'markings' },
    { key: '03_MAIN_OEUVRE_TEXTILE', kind: 'labors' },
    { key: '04_REGLES_TEXTILE', kind: 'rules' },
    { key: '04_RÈGLES_TEXTILE', kind: 'rules' },
    { key: '05_PALIERS_REMISES_TEXTILE', kind: 'tiers' },
  ];

  let created = 0;
  let updated = 0;
  let errors: string[] = [];
  let sheetsDone = 0;

  for (const { key, kind } of map) {
    const rows = sheets[key];
    if (!rows?.length) continue;
    const report = await importTextileExcel(kind, rows, opts);
    created += report.created;
    updated += report.updated;
    errors = errors.concat(report.errors);
    sheetsDone++;
  }

  await syncTextileAdminToPos(null, opts);

  return { sheets: sheetsDone, created, updated, errors };
}

export async function syncAllTextile(opts?: { userId?: string; userName?: string }) {
  return syncTextileAdminToPos(null, opts);
}

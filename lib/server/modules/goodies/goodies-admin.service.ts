/**
 * CRUD + import/export Goodies Admin + sync POS.
 */
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import {
  parseGoodiesModelExcelRow,
  parseGoodiesTechniqueExcelRow,
  parseGoodiesAddonExcelRow,
  parseGoodiesDepExcelRow,
  goodiesModelToExcelRow,
  goodiesTechniqueToExcelRow,
  goodiesAddonToExcelRow,
  goodiesDepToExcelRow,
} from '@/lib/backoffice/goodies-excel-format';
import { syncArticleOptionsToPOS } from '@/lib/services/catalog-options-sync.service';

export type GoodiesTableKind = 'models' | 'techniques' | 'addons' | 'deps';

export async function listGoodiesRows(kind: GoodiesTableKind) {
  if (kind === 'models') {
    return prisma.goodiesArticleModel.findMany({
      where: { deletedAt: null },
      orderBy: [{ articleId: 'asc' }, { sortOrder: 'asc' }, { typeModele: 'asc' }],
    });
  }
  if (kind === 'techniques') {
    return prisma.goodiesPrintingTechnique.findMany({
      where: { deletedAt: null },
      orderBy: [{ articleId: 'asc' }, { sortOrder: 'asc' }],
    });
  }
  if (kind === 'addons') {
    return prisma.goodiesAddon.findMany({
      where: { deletedAt: null },
      orderBy: [{ articleId: 'asc' }, { sortOrder: 'asc' }],
    });
  }
  return prisma.goodiesOptionDependency.findMany({
    where: { deletedAt: null },
    orderBy: [{ articleId: 'asc' }, { sourceField: 'asc' }],
  });
}

export function exportGoodiesExcelRows(kind: GoodiesTableKind, rows: Awaited<ReturnType<typeof listGoodiesRows>>) {
  if (kind === 'models') {
    return (rows as Awaited<ReturnType<typeof listGoodiesRows>> & object[]).map((r) =>
      goodiesModelToExcelRow(r as Parameters<typeof goodiesModelToExcelRow>[0]),
    );
  }
  if (kind === 'techniques') {
    return rows.map((r) => goodiesTechniqueToExcelRow(r as Parameters<typeof goodiesTechniqueToExcelRow>[0]));
  }
  if (kind === 'addons') {
    return rows.map((r) => goodiesAddonToExcelRow(r as Parameters<typeof goodiesAddonToExcelRow>[0]));
  }
  return rows.map((r) => goodiesDepToExcelRow(r as Parameters<typeof goodiesDepToExcelRow>[0]));
}

async function findByExcelOrName(
  model: {
    findFirst: (args: {
      where: Record<string, unknown>;
    }) => Promise<{ id: string } | null>;
  },
  excelId: string | null,
  articleId: string,
  nameField: string,
  name: string,
) {
  if (excelId) {
    const byExcel = await model.findFirst({ where: { excelId } });
    if (byExcel) return byExcel;
  }
  return model.findFirst({
    where: { articleId, [nameField]: name, deletedAt: null },
  });
}

export async function importGoodiesExcel(
  kind: GoodiesTableKind,
  rawRows: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string },
) {
  const report = { read: rawRows.length, created: 0, updated: 0, errors: [] as string[], synced: 0 };
  const touchedArticles = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const line = i + 2;
    try {
      if (kind === 'models') {
        const parsed = parseGoodiesModelExcelRow(rawRows[i]!, line);
        if ('error' in parsed) {
          report.errors.push(String(parsed.error ?? `Ligne ${line} invalide`));
          continue;
        }
        const data = parsed.row;
        const existing = await findByExcelOrName(
          prisma.goodiesArticleModel,
          data.excelId,
          data.articleId,
          'typeModele',
          data.typeModele,
        );
        if (existing) {
          await prisma.goodiesArticleModel.update({
            where: { id: existing.id },
            data: { ...data, deletedAt: null, updatedAt: new Date() },
          });
          report.updated++;
        } else {
          await prisma.goodiesArticleModel.create({ data });
          report.created++;
        }
        touchedArticles.add(data.articleId);
      } else if (kind === 'techniques') {
        const parsed = parseGoodiesTechniqueExcelRow(rawRows[i]!, line);
        if ('error' in parsed) {
          report.errors.push(String(parsed.error ?? `Ligne ${line} invalide`));
          continue;
        }
        const data = parsed.row;
        const existing = await findByExcelOrName(
          prisma.goodiesPrintingTechnique,
          data.excelId,
          data.articleId,
          'technique',
          data.technique,
        );
        if (existing) {
          await prisma.goodiesPrintingTechnique.update({
            where: { id: existing.id },
            data: { ...data, deletedAt: null, updatedAt: new Date() },
          });
          report.updated++;
        } else {
          await prisma.goodiesPrintingTechnique.create({ data });
          report.created++;
        }
        touchedArticles.add(data.articleId);
      } else if (kind === 'addons') {
        const parsed = parseGoodiesAddonExcelRow(rawRows[i]!, line);
        if ('error' in parsed) {
          report.errors.push(String(parsed.error ?? `Ligne ${line} invalide`));
          continue;
        }
        const data = parsed.row;
        const existing = await findByExcelOrName(
          prisma.goodiesAddon,
          data.excelId,
          data.articleId,
          'name',
          data.name,
        );
        if (existing) {
          await prisma.goodiesAddon.update({
            where: { id: existing.id },
            data: { ...data, deletedAt: null, updatedAt: new Date() },
          });
          report.updated++;
        } else {
          await prisma.goodiesAddon.create({ data });
          report.created++;
        }
        touchedArticles.add(data.articleId);
      } else {
        const parsed = parseGoodiesDepExcelRow(rawRows[i]!, line);
        if ('error' in parsed) {
          report.errors.push(String(parsed.error ?? `Ligne ${line} invalide`));
          continue;
        }
        const data = parsed.row;
        const existing = await findByExcelOrName(
          prisma.goodiesOptionDependency,
          data.excelId,
          data.articleId,
          'sourceValue',
          data.sourceValue,
        );
        if (existing) {
          await prisma.goodiesOptionDependency.update({
            where: { id: existing.id },
            data: { ...data, deletedAt: null, updatedAt: new Date() },
          });
          report.updated++;
        } else {
          await prisma.goodiesOptionDependency.create({ data });
          report.created++;
        }
        touchedArticles.add(data.articleId);
      }
    } catch (e) {
      report.errors.push(`Ligne ${line}: ${e instanceof Error ? e.message : 'erreur'}`);
    }
  }

  for (const aid of touchedArticles) {
    await syncArticleOptionsToPOS(aid, opts);
    report.synced++;
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT',
    entity: `Goodies:${kind}`,
    details: report,
  });

  return report;
}

export async function softDeleteGoodiesRow(
  kind: GoodiesTableKind,
  id: string,
  opts?: { userId?: string; userName?: string },
) {
  const now = new Date();
  let articleId = '';
  if (kind === 'models') {
    const r = await prisma.goodiesArticleModel.update({
      where: { id },
      data: { deletedAt: now, active: false, status: 'archived', visiblePOS: false },
    });
    articleId = r.articleId;
  } else if (kind === 'techniques') {
    const r = await prisma.goodiesPrintingTechnique.update({
      where: { id },
      data: { deletedAt: now, active: false, status: 'archived', visiblePOS: false },
    });
    articleId = r.articleId;
  } else if (kind === 'addons') {
    const r = await prisma.goodiesAddon.update({
      where: { id },
      data: { deletedAt: now, active: false, status: 'archived', visiblePOS: false },
    });
    articleId = r.articleId;
  } else {
    const r = await prisma.goodiesOptionDependency.update({
      where: { id },
      data: { deletedAt: now, active: false },
    });
    articleId = r.articleId;
  }
  if (articleId) await syncArticleOptionsToPOS(articleId, opts);
  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'ARCHIVE',
    entity: `Goodies:${kind}`,
    entityId: id,
  });
  return { ok: true, articleId };
}

export async function patchGoodiesRow(
  kind: GoodiesTableKind,
  id: string,
  body: Record<string, unknown>,
  opts?: { userId?: string; userName?: string },
) {
  const sync = body.action === 'sync' || body.action === 'publish';
  let articleId = '';

  if (kind === 'models') {
    const data: Record<string, unknown> = {};
    if (body.prixVierge != null) data.prixVierge = Number(body.prixVierge);
    if (body.typeModele != null) data.typeModele = String(body.typeModele);
    if (body.visiblePOS != null) data.visiblePOS = Boolean(body.visiblePOS);
    if (body.active != null) data.active = Boolean(body.active);
    if (body.status != null) data.status = String(body.status);
    if (body.action === 'publish') data.status = 'published';
    const r = await prisma.goodiesArticleModel.update({ where: { id }, data });
    articleId = r.articleId;
  } else if (kind === 'techniques') {
    const data: Record<string, unknown> = {};
    if (body.prixTechnique != null) data.prixTechnique = Number(body.prixTechnique);
    if (body.technique != null) data.technique = String(body.technique);
    if (body.visiblePOS != null) data.visiblePOS = Boolean(body.visiblePOS);
    if (body.active != null) data.active = Boolean(body.active);
    if (body.action === 'publish') data.status = 'published';
    const r = await prisma.goodiesPrintingTechnique.update({ where: { id }, data });
    articleId = r.articleId;
  } else if (kind === 'addons') {
    const data: Record<string, unknown> = {};
    if (body.price != null) data.price = Number(body.price);
    if (body.name != null) data.name = String(body.name);
    if (body.visiblePOS != null) data.visiblePOS = Boolean(body.visiblePOS);
    if (body.active != null) data.active = Boolean(body.active);
    if (body.action === 'publish') data.status = 'published';
    const r = await prisma.goodiesAddon.update({ where: { id }, data });
    articleId = r.articleId;
  } else {
    const data: Record<string, unknown> = {};
    if (body.allowedValues != null) data.allowedValues = String(body.allowedValues);
    if (body.active != null) data.active = Boolean(body.active);
    const r = await prisma.goodiesOptionDependency.update({ where: { id }, data });
    articleId = r.articleId;
  }

  if (sync && articleId) await syncArticleOptionsToPOS(articleId, opts);
  else {
    try {
      const { notifyAdminModuleMutation } = await import('@/lib/services/admin-data-sync.service');
      await notifyAdminModuleMutation(`goodies:${kind}`, {
        userId: opts?.userId,
        userName: opts?.userName,
        details: { articleId, action: body.action ?? 'patch' },
      });
    } catch {
      /* best-effort */
    }
  }
  return { ok: true, articleId };
}

export async function syncAllGoodies(opts?: { userId?: string; userName?: string }) {
  return syncArticleOptionsToPOS(undefined, opts);
}

export async function listGoodiesTrash(kind: GoodiesTableKind) {
  if (kind === 'models') {
    return prisma.goodiesArticleModel.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
  }
  if (kind === 'techniques') {
    return prisma.goodiesPrintingTechnique.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
  }
  if (kind === 'addons') {
    return prisma.goodiesAddon.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
  }
  return prisma.goodiesOptionDependency.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
  });
}

export async function restoreGoodiesRow(
  kind: GoodiesTableKind,
  id: string,
  opts?: { userId?: string; userName?: string },
) {
  let articleId = '';
  if (kind === 'models') {
    const r = await prisma.goodiesArticleModel.update({
      where: { id },
      data: { deletedAt: null, active: true, status: 'published', visiblePOS: true },
    });
    articleId = r.articleId;
  } else if (kind === 'techniques') {
    const r = await prisma.goodiesPrintingTechnique.update({
      where: { id },
      data: { deletedAt: null, active: true, status: 'published', visiblePOS: true },
    });
    articleId = r.articleId;
  } else if (kind === 'addons') {
    const r = await prisma.goodiesAddon.update({
      where: { id },
      data: { deletedAt: null, active: true, status: 'published', visiblePOS: true },
    });
    articleId = r.articleId;
  } else {
    const r = await prisma.goodiesOptionDependency.update({
      where: { id },
      data: { deletedAt: null, active: true },
    });
    articleId = r.articleId;
  }
  if (articleId) await syncArticleOptionsToPOS(articleId, opts);
  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'RESTORE',
    entity: `Goodies:${kind}`,
    entityId: id,
  });
  return { ok: true, articleId };
}

/** Export workbook 4 feuilles (données Excel-ready). */
export async function exportGoodiesWorkbook() {
  const kinds: GoodiesTableKind[] = ['models', 'techniques', 'addons', 'deps'];
  const sheets: Record<GoodiesTableKind, Record<string, unknown>[]> = {
    models: [],
    techniques: [],
    addons: [],
    deps: [],
  };
  for (const kind of kinds) {
    const rows = await listGoodiesRows(kind);
    sheets[kind] = exportGoodiesExcelRows(kind, rows);
  }
  return sheets;
}

/** Import workbook : map sheetName → rows. */
export async function importGoodiesWorkbook(
  sheets: Partial<Record<string, Record<string, unknown>[]>>,
  opts?: { userId?: string; userName?: string },
) {
  const sheetToKind = (name: string): GoodiesTableKind | null => {
    const n = name.toLowerCase();
    if (/01|modele|modèle|model/i.test(n)) return 'models';
    if (/02|technique/i.test(n)) return 'techniques';
    if (/03|supplement|supplément|addon/i.test(n)) return 'addons';
    if (/04|depend|dépend/i.test(n)) return 'deps';
    return null;
  };

  const aggregate = {
    created: 0,
    updated: 0,
    errors: [] as string[],
    synced: 0,
    sheets: 0,
  };

  for (const [name, rows] of Object.entries(sheets)) {
    if (!rows?.length) continue;
    const kind = sheetToKind(name);
    if (!kind) continue;
    const report = await importGoodiesExcel(kind, rows, opts);
    aggregate.created += report.created;
    aggregate.updated += report.updated;
    aggregate.errors.push(...report.errors);
    aggregate.synced += report.synced;
    aggregate.sheets += 1;
  }

  // Sync global une fois si aucune feuille n’a syncé individuellement
  if (aggregate.sheets > 0 && aggregate.synced === 0) {
    const sync = await syncAllGoodies(opts);
    aggregate.synced = (sync.modelsSynced ?? 0) + (sync.techniquesSynced ?? 0);
  }

  return aggregate;
}

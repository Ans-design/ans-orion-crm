import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { formatExcelRowId } from '@/lib/backoffice/material-main-reference';
import { parsePrixArticlesExcelRow } from '@/lib/backoffice/prix-articles-excel-format';
import { slugifyDirectSaleName } from '@/lib/direct-sale/categories';
import { syncDirectSaleArticleToPos } from '@/lib/services/direct-sale-pos-sync.service';

export type PrixArticlesImportReport = {
  read: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
  synced: number;
  /** Stocks appliqués côté UI (pas de colonne DB DirectSale). */
  stockHints: Array<{ articleId: string; qty: number | null }>;
  issues: Array<{ line: number; reason: string }>;
};

function floatEq(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) < 0.005;
}

async function findArticleByExcelOrName(
  excelId: string | null,
  name: string,
  reference?: string | null,
) {
  if (excelId) {
    const byExcel = await prisma.directSaleArticle.findFirst({ where: { excelId } });
    if (byExcel) return byExcel;
    try {
      const byId = await prisma.directSaleArticle.findUnique({ where: { id: excelId } });
      if (byId) return byId;
    } catch {
      /* id non-cuid */
    }
    const byRefAsId = await prisma.directSaleArticle.findFirst({
      where: { reference: excelId },
    });
    if (byRefAsId) return byRefAsId;
  }
  const ref = reference?.trim();
  if (ref) {
    const byRef = await prisma.directSaleArticle.findFirst({ where: { reference: ref } });
    if (byRef) return byRef;
  }
  return prisma.directSaleArticle.findFirst({
    where: { slug: slugifyDirectSaleName(name) },
  });
}

function parseStockHint(raw: string | null | undefined): number | null {
  if (raw == null || String(raw).trim() === '') return null;
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function importPrixArticlesFromExcel(
  rawLines: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string; fileName?: string },
): Promise<PrixArticlesImportReport> {
  const report: PrixArticlesImportReport = {
    read: rawLines.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    synced: 0,
    stockHints: [],
    issues: [],
  };

  const syncIds = new Set<string>();

  for (let i = 0; i < rawLines.length; i++) {
    const line = i + 2;
    const parsed = parsePrixArticlesExcelRow(rawLines[i]!, line);
    if ('error' in parsed) {
      report.errors += 1;
      report.issues.push({ line, reason: parsed.error ?? 'Erreur ligne' });
      continue;
    }

    const data = parsed.row;

    try {
      const existing = await findArticleByExcelOrName(
        data.excelId,
        data.name,
        data.reference,
      );
      const excelId = data.excelId ?? existing?.excelId ?? formatExcelRowId(i + 1);
      const isArtVariant = /^ART-/i.test(String(excelId));
      const payload = {
        name: data.name,
        category: data.category,
        subCategory: data.subCategory,
        materialName: data.materialName,
        materialKey: data.materialKey,
        defaultColor: data.defaultColor,
        blankUnitPrice: data.blankUnitPrice,
        marginPercent: data.marginPercent,
        unitPrice: data.unitPrice,
        visiblePOS: isArtVariant ? false : data.visiblePOS,
        status: isArtVariant ? 'archived' : data.status,
        isCustomizable: false,
        requiresQuoteIfCustom: false,
        excelId,
        reference:
          data.reference
          ?? existing?.reference
          ?? null,
        updatedAt: new Date(),
      };

      let articleId: string;

      if (existing) {
        const changed =
          existing.name !== payload.name
          || existing.category !== payload.category
          || existing.subCategory !== payload.subCategory
          || existing.materialName !== payload.materialName
          || existing.materialKey !== payload.materialKey
          || existing.defaultColor !== payload.defaultColor
          || !floatEq(existing.blankUnitPrice, payload.blankUnitPrice)
          || !floatEq(existing.marginPercent, payload.marginPercent)
          || !floatEq(existing.unitPrice, payload.unitPrice)
          || existing.visiblePOS !== payload.visiblePOS
          || existing.status !== payload.status
          || existing.excelId !== excelId
          || (payload.reference != null && existing.reference !== payload.reference);

        // Toujours écrire la ligne Excel (source de vérité) pour éviter les skips silencieux
        await prisma.directSaleArticle.update({
          where: { id: existing.id },
          data: { ...payload, slug: existing.slug },
        });
        if (changed) report.updated += 1;
        else report.unchanged += 1;
        articleId = existing.id;
      } else {
        const created = await prisma.directSaleArticle.create({
          data: {
            ...payload,
            slug: slugifyDirectSaleName(data.name),
          },
        });
        report.created += 1;
        articleId = created.id;
      }

      const stockQty = parseStockHint(data.stockHint);
      report.stockHints.push({ articleId, qty: stockQty });

      if (!isArtVariant && (payload.status === 'published' || payload.visiblePOS)) {
        syncIds.add(articleId);
      }
    } catch (e) {
      report.errors += 1;
      report.issues.push({
        line,
        reason: e instanceof Error ? e.message : 'Erreur enregistrement',
      });
    }
  }

  for (const id of syncIds) {
    try {
      await syncDirectSaleArticleToPos(id, {
        userId: opts?.userId,
        userName: opts?.userName,
        preferArticlePrice: true,
      });
      report.synced += 1;
    } catch {
      report.issues.push({
        line: 0,
        reason: `Sync POS échouée pour ${id}`,
      });
    }
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT',
    entity: 'DirectSaleArticle',
    entityLabel: opts?.fileName ?? 'prix-articles-excel',
    details: {
      ...report,
      stockHints: report.stockHints.length,
    },
  });

  return report;
}

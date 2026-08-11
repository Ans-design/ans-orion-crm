import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { logAudit } from '@/lib/audit';
import { formatExcelRowId } from '@/lib/backoffice/material-main-reference';
import { parseChipExcelRow } from '@/lib/backoffice/chips-excel-format';
import {
  detectDuplicateExcelIds,
  duplicateExcelIdIssues,
  countDuplicateExcelIdSkips,
  type DuplicateExcelIdGroup,
} from '@/lib/backoffice/material-excel-duplicate-ids';
import { excelRowToChipCanonical } from '@/lib/backoffice/chips-excel-format';
import { patchChipGroup, patchChipValue, createChipGroupFromExcel } from './admin-backoffice-chips.service';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';

export type ChipsImportIssue = { line: number; field?: string; reason: string };

export type ChipsImportReport = {
  read: number;
  created: number;
  updated: number;
  unchanged: number;
  ignored: number;
  errors: number;
  duplicateIds: number;
  duplicateIdGroups: DuplicateExcelIdGroup[];
  syncModeUsed: 'upsert';
  issues: ChipsImportIssue[];
};

function readExcelRowId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const id = (metadata as Record<string, unknown>).excelRowId;
  return id != null && String(id).trim() ? String(id).trim() : null;
}

function withExcelRowId(metadata: unknown, excelRowId: string): Record<string, unknown> {
  const base =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  base.excelRowId = excelRowId;
  return base;
}

/** Assigne IDs Excel 001, 002… dans metadata des groupes sans ID */
export async function ensureChipsExcelRowIds(): Promise<{ assigned: number; preserved: number }> {
  const groups = await prisma.productOptionGroup.findMany({
    orderBy: [{ articleId: 'asc' }, { sortOrder: 'asc' }],
    select: { id: true, metadata: true },
  });

  const used = new Set<string>();
  let maxNum = 0;
  for (const g of groups) {
    const id = readExcelRowId(g.metadata);
    if (id) {
      used.add(id);
      const n = parseInt(id, 10);
      if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
    }
  }

  let assigned = 0;
  let preserved = 0;
  for (const g of groups) {
    if (readExcelRowId(g.metadata)) {
      preserved += 1;
      continue;
    }
    maxNum += 1;
    const nextId = formatExcelRowId(maxNum);
    await prisma.productOptionGroup.update({
      where: { id: g.id },
      data: { metadata: withExcelRowId(g.metadata, nextId) as Prisma.InputJsonValue },
    });
    assigned += 1;
  }
  return { assigned, preserved };
}

export async function importChipsFromExcel(
  rawLines: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string; fileName?: string },
): Promise<ChipsImportReport> {
  const duplicateIdGroups = detectDuplicateExcelIds(rawLines, excelRowToChipCanonical);
  const duplicateIssues = duplicateExcelIdIssues(duplicateIdGroups) as ChipsImportIssue[];

  const report: ChipsImportReport = {
    read: rawLines.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    ignored: 0,
    errors: 0,
    duplicateIds: countDuplicateExcelIdSkips(duplicateIdGroups),
    duplicateIdGroups,
    syncModeUsed: 'upsert',
    issues: [...duplicateIssues],
  };

  const skipIndexes = new Set<number>();
  for (const group of duplicateIdGroups) {
    for (let i = 1; i < group.entries.length; i++) {
      skipIndexes.add(group.entries[i]!.rowIndex);
    }
  }

  const profiles = await prisma.articlePricingProfile.findMany({
    select: { articleId: true, articleLabel: true },
  });
  const articleByLabel = new Map<string, string>();
  for (const p of profiles) {
    articleByLabel.set(p.articleLabel.trim().toLowerCase(), p.articleId);
    articleByLabel.set(p.articleId.toLowerCase(), p.articleId);
  }

  const groups = await prisma.productOptionGroup.findMany({
    include: { profile: { select: { articleLabel: true } } },
  });

  const byExcelId = new Map<string, (typeof groups)[0]>();
  const byTechnicalId = new Map<string, (typeof groups)[0]>();
  const byArticleField = new Map<string, (typeof groups)[0]>();

  for (const g of groups) {
    byTechnicalId.set(g.id, g);
    const excelId = readExcelRowId(g.metadata);
    if (excelId) byExcelId.set(excelId, g);
    byArticleField.set(`${g.articleId}::${g.fieldKey}`, g);
    const label = g.profile?.articleLabel?.trim().toLowerCase();
    if (label) byArticleField.set(`${label}::${g.fieldKey}`, g);
  }

  for (let i = 0; i < rawLines.length; i++) {
    if (skipIndexes.has(i)) {
      report.ignored += 1;
      continue;
    }

    const parsed = parseChipExcelRow(rawLines[i]!, i);
    if (!parsed.fieldKey && !parsed.label) {
      report.ignored += 1;
      report.issues.push({ line: parsed.lineNo, field: 'CHAMP', reason: 'Champ ou libellé manquant' });
      continue;
    }
    const fieldKey =
      parsed.fieldKey
      || parsed.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

    let articleId =
      articleByLabel.get(parsed.articleLabel.toLowerCase())
      ?? (parsed.articleReference ? articleByLabel.get(parsed.articleReference.toLowerCase()) : undefined)
      ?? (parsed.articleReference || '');
    if (!articleId && parsed.technicalId) {
      articleId = profiles.find((p) => p.articleId === parsed.technicalId)?.articleId ?? '';
    }

    let target =
      (parsed.excelRowId ? byExcelId.get(parsed.excelRowId) : undefined)
      ?? (parsed.groupId ? byTechnicalId.get(parsed.groupId) : undefined)
      ?? (articleId && fieldKey ? byArticleField.get(`${articleId}::${fieldKey}`) : undefined)
      ?? (parsed.articleLabel && fieldKey
        ? byArticleField.get(`${parsed.articleLabel.toLowerCase()}::${fieldKey}`)
        : undefined);

    if (!articleId && !target) {
      report.ignored += 1;
      report.issues.push({
        line: parsed.lineNo,
        field: 'ARTICLE',
        reason: `Article « ${parsed.articleLabel} » introuvable`,
      });
      continue;
    }

    if (!target && articleId && fieldKey) {
      try {
        const newId = await createChipGroupFromExcel({
          articleId,
          fieldKey,
          label: parsed.label || fieldKey,
          fieldType: parsed.fieldType,
          sortOrder: parsed.sortOrder,
          visiblePos: parsed.visiblePos,
          active: parsed.active,
          impactsPrice: parsed.impactsPrice,
          isInformational: parsed.indicatif ?? (!parsed.impactsPrice && parsed.active),
          excelRowId: parsed.excelRowId,
          priceModifier: parsed.montant ?? null,
        });
        target = await prisma.productOptionGroup.findUnique({
          where: { id: newId },
          include: { profile: { select: { articleLabel: true } } },
        }) ?? undefined;
        if (target) {
          byTechnicalId.set(target.id, target);
          if (parsed.excelRowId) byExcelId.set(parsed.excelRowId, target);
          byArticleField.set(`${articleId}::${fieldKey}`, target);
          report.created += 1;
          continue;
        }
      } catch (e) {
        report.errors += 1;
        report.issues.push({
          line: parsed.lineNo,
          reason: e instanceof Error ? e.message : 'Création variable impossible',
        });
        continue;
      }
    }

    if (!target) {
      report.ignored += 1;
      report.issues.push({
        line: parsed.lineNo,
        reason: `Variable introuvable — CHAMP requis (${parsed.articleLabel} / ${fieldKey || '?'})`,
      });
      continue;
    }

    try {
      const isInformational =
        parsed.indicatif !== undefined
          ? parsed.indicatif
          : (!parsed.impactsPrice && parsed.active);

      const patch = {
        label: parsed.label || target.label,
        active: parsed.active,
        visiblePos: parsed.visiblePos,
        impactsPrice: parsed.impactsPrice,
        isInformational,
      };

      const changed =
        patch.label !== target.label
        || patch.active !== target.active
        || patch.visiblePos !== target.visiblePos
        || patch.impactsPrice !== target.impactsPrice
        || patch.isInformational !== target.isInformational
        || parsed.sortOrder !== target.sortOrder
        || (parsed.excelRowId && readExcelRowId(target.metadata) !== parsed.excelRowId)
        || (parsed.montant !== undefined && parsed.montant !== null);

      if (!changed) {
        report.unchanged += 1;
        continue;
      }

      await patchChipGroup(target.id, patch);

      if (parsed.montant !== undefined && parsed.montant !== null && !Number.isNaN(parsed.montant)) {
        const firstValue = await prisma.productOptionValue.findFirst({
          where: { groupId: target.id, active: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true },
        });
        if (firstValue) {
          await patchChipValue(firstValue.id, { priceModifier: parsed.montant });
        }
      }

        await prisma.productOptionGroup.update({
          where: { id: target.id },
          data: {
            ...(parsed.sortOrder !== target.sortOrder ? { sortOrder: parsed.sortOrder } : {}),
            ...(parsed.excelRowId
              ? { metadata: withExcelRowId(target.metadata, parsed.excelRowId) as Prisma.InputJsonValue }
              : {}),
          },
        });

      report.updated += 1;
    } catch (e) {
      report.errors += 1;
      report.issues.push({
        line: parsed.lineNo,
        reason: e instanceof Error ? e.message : 'Erreur import',
      });
    }
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT_EXCEL',
    entity: 'ProductOptionGroup',
    entityLabel: 'Options / Chips',
    details: {
      module: 'Options / Chips',
      fileName: opts?.fileName ?? null,
      syncMode: 'upsert',
      ...report,
      issues: report.issues.slice(0, 30),
    },
  });

  await notifyAdminModuleMutation('chips', {
    userId: opts?.userId,
    userName: opts?.userName,
    details: { import: report },
  });

  return report;
}

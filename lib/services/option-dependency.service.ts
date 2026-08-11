/**
 * OptionDependency générique — Admin → POS.
 */
import { prisma } from '@/lib/prisma';
import type { OptionDependencyRule } from '@/lib/pos/product-option-overrides.types';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';
import {
  validateOptionDependencies,
  wouldCreateBlockingIssue,
  type OptionDependencyEdge,
} from '@/lib/backoffice/option-dependency-validation';

function hasDelegate(): boolean {
  const client = prisma as unknown as Record<string, unknown>;
  return typeof client.optionDependency === 'object' && client.optionDependency != null;
}

function parseAllowed(raw: string): string[] {
  return String(raw ?? '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function listOptionDependencies(articleId?: string) {
  if (!hasDelegate()) return [];
  return prisma.optionDependency.findMany({
    where: {
      deletedAt: null,
      active: true,
      ...(articleId ? { articleId } : {}),
    },
    orderBy: [{ articleId: 'asc' }, { sourceField: 'asc' }],
  });
}

/** Issues SI/ALORS (cycles, self-edge, contradictions) pour l’UI diagnostics. */
export async function diagnoseOptionDependencies(articleId?: string) {
  const rows = (await listOptionDependencies(articleId)) as OptionDependencyEdge[];
  return validateOptionDependencies(rows);
}

export async function loadOptionDependencyRulesForArticle(
  articleId: string,
): Promise<OptionDependencyRule[]> {
  if (!hasDelegate()) return [];
  const rows = await prisma.optionDependency.findMany({
    where: { articleId, active: true, deletedAt: null },
  }).catch(() => []);
  return (rows as Array<{
    sourceField: string;
    sourceValue: string;
    targetField: string;
    allowedValues: string;
    action: string;
  }>).map((r) => ({
    sourceField: r.sourceField,
    sourceValue: r.sourceValue,
    targetField: r.targetField,
    allowedValues: parseAllowed(r.allowedValues),
    action: r.action || 'filter',
  }));
}

export async function upsertOptionDependency(input: {
  id?: string;
  articleId: string;
  sourceField: string;
  sourceValue: string;
  targetField: string;
  allowedValues: string[] | string;
  action?: string;
  active?: boolean;
  details?: string | null;
  excelId?: string | null;
}, opts?: { userId?: string; userName?: string }) {
  if (!hasDelegate()) throw new Error('OptionDependency non disponible — prisma generate requis');

  const allowedValues = Array.isArray(input.allowedValues)
    ? input.allowedValues.join('|')
    : String(input.allowedValues ?? '');

  const existing = (await listOptionDependencies(input.articleId)) as OptionDependencyEdge[];
  const blocking = wouldCreateBlockingIssue(existing, {
    id: input.id,
    articleId: input.articleId,
    sourceField: input.sourceField,
    sourceValue: input.sourceValue,
    targetField: input.targetField,
    allowedValues,
    action: input.action ?? 'filter',
  });
  if (blocking) {
    throw new Error(blocking.message);
  }

  const data = {
    articleId: input.articleId,
    sourceField: input.sourceField,
    sourceValue: input.sourceValue,
    targetField: input.targetField,
    allowedValues,
    action: input.action ?? 'filter',
    active: input.active !== false,
    details: input.details ?? null,
    excelId: input.excelId ?? undefined,
    deletedAt: null,
  };

  let row;
  if (input.id) {
    row = await prisma.optionDependency.update({
      where: { id: input.id },
      data,
    });
  } else {
    row = await prisma.optionDependency.create({ data });
  }

  await notifyAdminModuleMutation('option-dependency', {
    userId: opts?.userId,
    userName: opts?.userName,
    details: { articleId: input.articleId, id: row.id },
  });

  return row;
}

export async function softDeleteOptionDependency(
  id: string,
  opts?: { userId?: string; userName?: string },
) {
  if (!hasDelegate()) return null;
  const row = await prisma.optionDependency.update({
    where: { id },
    data: { active: false, deletedAt: new Date() },
  });
  await notifyAdminModuleMutation('option-dependency', {
    userId: opts?.userId,
    userName: opts?.userName,
    details: { id, deleted: true },
  });
  return row;
}

/** Sync GoodiesOptionDependency → OptionDependency (même article). */
export async function syncChipsDependenciesToGeneric(articleId?: string) {
  if (!hasDelegate()) return { synced: 0 };
  const where = {
    active: true,
    deletedAt: null,
    ...(articleId ? { articleId } : {}),
  };
  const goodies = await prisma.goodiesOptionDependency.findMany({ where }).catch(() => []);
  let synced = 0;
  for (const g of goodies) {
    const existing = await prisma.optionDependency.findFirst({
      where: {
        articleId: g.articleId,
        sourceField: g.sourceField,
        sourceValue: g.sourceValue,
        targetField: g.targetField,
        deletedAt: null,
      },
    });
    const data = {
      articleId: g.articleId,
      sourceField: g.sourceField,
      sourceValue: g.sourceValue,
      targetField: g.targetField,
      allowedValues: g.allowedValues,
      action: g.action,
      active: g.active,
      details: g.details,
      excelId: g.excelId ? `goodies:${g.excelId}` : `goodies:${g.id}`,
    };
    if (existing) {
      await prisma.optionDependency.update({ where: { id: existing.id }, data });
    } else {
      await prisma.optionDependency.create({ data });
    }
    synced += 1;
  }
  return { synced };
}

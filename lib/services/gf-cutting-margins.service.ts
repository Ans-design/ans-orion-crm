/**
 * Marges découpe Grand Format — CRUD + seed + runtime sync.
 */
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_GF_CUTTING_MARGINS,
  setGfCuttingMarginsRuntime,
  type GfCuttingMarginRule,
} from '@/lib/grand-format/cutting-margins';
import { logAudit } from '@/lib/audit';

export async function ensureGfCuttingMarginsSeeded(): Promise<number> {
  let created = 0;
  for (let i = 0; i < DEFAULT_GF_CUTTING_MARGINS.length; i++) {
    const row = DEFAULT_GF_CUTTING_MARGINS[i]!;
    const existing = await prisma.grandFormatCuttingMargin.findUnique({
      where: { formatCode: row.formatCode },
    });
    if (!existing) {
      await prisma.grandFormatCuttingMargin.create({
        data: {
          formatCode: row.formatCode,
          surfaceRatio: row.surfaceRatio,
          marginPercent: row.marginPercent,
          motif: row.motif,
          active: true,
          comment: row.comment ?? null,
          sortOrder: i,
          excelId: `GF-CUT-${row.formatCode}`,
        },
      });
      created += 1;
    }
  }
  return created;
}

export async function loadGfCuttingMarginsToRuntime(): Promise<GfCuttingMarginRule[]> {
  try {
    await ensureGfCuttingMarginsSeeded();
    const rows = await prisma.grandFormatCuttingMargin.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    const rules: GfCuttingMarginRule[] = rows.map((r) => ({
      formatCode: r.formatCode,
      surfaceRatio: r.surfaceRatio,
      marginPercent: r.marginPercent,
      motif: r.motif ?? '',
      active: r.active,
      comment: r.comment ?? undefined,
    }));
    setGfCuttingMarginsRuntime(rules.length ? rules : null);
    return rules;
  } catch {
    setGfCuttingMarginsRuntime(null);
    return DEFAULT_GF_CUTTING_MARGINS;
  }
}

export async function listGfCuttingMargins() {
  await ensureGfCuttingMarginsSeeded();
  return prisma.grandFormatCuttingMargin.findMany({ orderBy: { sortOrder: 'asc' } });
}

export async function upsertGfCuttingMargin(input: {
  formatCode: string;
  surfaceRatio: number;
  marginPercent: number;
  motif?: string;
  active?: boolean;
  comment?: string;
  userId?: string;
}) {
  const code = input.formatCode.toUpperCase();
  const row = await prisma.grandFormatCuttingMargin.upsert({
    where: { formatCode: code },
    create: {
      formatCode: code,
      surfaceRatio: input.surfaceRatio,
      marginPercent: input.marginPercent,
      motif: input.motif ?? 'Découpe / risque / chute',
      active: input.active !== false,
      comment: input.comment ?? null,
      excelId: `GF-CUT-${code}`,
    },
    update: {
      surfaceRatio: input.surfaceRatio,
      marginPercent: input.marginPercent,
      motif: input.motif,
      active: input.active,
      comment: input.comment,
    },
  });
  await loadGfCuttingMarginsToRuntime();
  await logAudit({
    userId: input.userId,
    action: 'UPSERT',
    entity: 'GrandFormatCuttingMargin',
    entityId: row.id,
    entityLabel: code,
    details: input,
  });
  return row;
}

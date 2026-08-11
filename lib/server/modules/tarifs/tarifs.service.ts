import { prisma } from '@/lib/prisma';
import { containsQ } from '@/lib/prisma-filters';
import type { TarifListQuery, UpsertTarifInput } from './tarifs.validation';

export function parseTarifListQuery(params: URLSearchParams): TarifListQuery {
  return {
    articleId: params.get('articleId') || undefined,
    search: params.get('search') || undefined,
  };
}

function buildTarifWhere(query: TarifListQuery) {
  const where: Record<string, unknown> = { actif: true };
  if (query.articleId) where.articleId = query.articleId;
  if (query.search) {
    where.OR = [
      { articleId: containsQ(query.search) },
      { articleLabel: containsQ(query.search) },
    ];
  }
  return where;
}

export async function listTarifs(query: TarifListQuery) {
  return prisma.tarif.findMany({
    where: buildTarifWhere(query),
    orderBy: [{ articleId: 'asc' }, { palier: 'asc' }],
  });
}

export async function upsertTarifRecord(
  input: UpsertTarifInput,
  opts: { userId?: string; userName?: string | null },
) {
  const palier = input.palier ?? 1;
  return prisma.tarif.upsert({
    where: { articleId_palier: { articleId: input.articleId, palier } },
    create: {
      articleId: input.articleId,
      articleLabel: input.articleLabel,
      palier,
      prixUnitaire: input.prixUnitaire ?? 0,
      prixBase: input.prixBase ?? null,
      notes: input.notes ?? null,
      modifiePar: opts.userName ?? null,
    },
    update: {
      prixUnitaire: input.prixUnitaire ?? 0,
      articleLabel: input.articleLabel,
      notes: input.notes ?? null,
      modifiePar: opts.userName ?? null,
    },
  });
}

export async function deactivateTarif(id: string) {
  return prisma.tarif.update({
    where: { id },
    data: { actif: false },
  });
}

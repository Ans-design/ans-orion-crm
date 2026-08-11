import { getPrismaClient } from '@/lib/prisma';
import { containsQ } from '@/lib/prisma-filters';
import {
  buildCatalogueSnapshot,
  filterCatalogFormulas,
  isPrismaReglesReady,
} from '@/lib/regles-catalog';

export type FormuleListQuery = {
  search?: string;
  family?: string;
  articleId?: string;
};

function catalogueFormulasPayload(query: FormuleListQuery) {
  const snapshot = buildCatalogueSnapshot();
  const formulas = filterCatalogFormulas(snapshot.formulas, {
    search: query.search ?? '',
    family: query.family ?? '',
    articleId: query.articleId ?? '',
  });
  return {
    formulas,
    stats: {
      total: snapshot.formulas.length,
      active: snapshot.formulas.filter((f) => f.active).length,
    },
    source: 'html-catalogue' as const,
    persisted: false,
  };
}

export function parseFormuleListQuery(params: URLSearchParams): FormuleListQuery {
  return {
    family: params.get('family') || undefined,
    articleId: params.get('articleId') || undefined,
    search: params.get('search') || undefined,
  };
}

export async function listFormules(query: FormuleListQuery) {
  const db = getPrismaClient();
  if (!isPrismaReglesReady(db)) {
    return catalogueFormulasPayload(query);
  }

  try {
    const where: Record<string, unknown> = {};
    if (query.family) where.family = query.family;
    if (query.articleId) where.articleId = query.articleId;
    if (query.search) {
      where.OR = [
        { label: containsQ(query.search) },
        { formulaKey: containsQ(query.search) },
        { expression: containsQ(query.search) },
      ];
    }

    const [formulas, total, active] = await Promise.all([
      db.priceFormula.findMany({ where, orderBy: { label: 'asc' } }),
      db.priceFormula.count(),
      db.priceFormula.count({ where: { active: true } }),
    ]);

    if (total === 0) {
      return catalogueFormulasPayload(query);
    }

    return {
      formulas,
      stats: { total, active },
      source: 'database' as const,
      persisted: true,
    };
  } catch {
    return catalogueFormulasPayload(query);
  }
}

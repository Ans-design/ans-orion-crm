import { prisma } from '@/lib/prisma';
import {
  mergePriceImpactMetadata,
  resolveFieldPriceImpact,
} from '@/lib/pricing/price-impact-rules';
import type {
  FieldOptionOverride,
  ProductOptionOverrides,
} from '@/lib/pos/product-option-overrides.types';

function mapGroupToOverride(
  articleId: string,
  group: {
    id: string;
    fieldKey: string;
    active: boolean;
    visiblePos: boolean;
    impactsPrice: boolean;
    impactsStock: boolean;
    impactsProduction: boolean;
    isInformational: boolean;
    metadata: unknown;
    values: { label: string; active: boolean }[];
  },
): FieldOptionOverride {
  const impact = resolveFieldPriceImpact({
    articleId,
    fieldKey: group.fieldKey,
    metadata: group.metadata,
    defaultImpactsPrice: group.impactsPrice,
    defaultIsInformational: group.isInformational,
  });

  const inactiveValueLabels = group.values
    .filter((v) => !v.active)
    .map((v) => v.label);

  const activeValueLabels = group.values
    .filter((v) => v.active)
    .map((v) => v.label);

  const meta = (group.metadata as Record<string, unknown> | null) ?? {};
  const rawDeps = meta.dependencies;
  const dependencies = Array.isArray(rawDeps)
    ? (rawDeps as FieldOptionOverride['dependencies'])
    : undefined;

  return {
    fieldKey: group.fieldKey,
    groupId: group.id,
    active: group.active,
    visiblePos: group.visiblePos,
    impactsPrice: impact.impactsPrice,
    impactsStock: group.impactsStock,
    impactsProduction: group.impactsProduction,
    isInformational: impact.isInformational,
    metadata: mergePriceImpactMetadata(meta, impact) as Record<string, unknown>,
    inactiveValueLabels,
    activeValueLabels,
    dependencies,
  };
}

/** Charge les overrides DB pour synchroniser POS / devis avec le backoffice (effet immédiat). */
export async function loadProductOptionOverridesForPos(
  articleId: string,
): Promise<ProductOptionOverrides> {
  try {
    const groups = await prisma.productOptionGroup.findMany({
      where: { articleId },
      orderBy: { sortOrder: 'asc' },
      include: {
        values: { orderBy: { sortOrder: 'asc' } },
      },
    });

    const fields: Record<string, FieldOptionOverride> = {};
    let dependencies: ProductOptionOverrides['dependencies'] = [];
    for (const group of groups) {
      const ov = mapGroupToOverride(articleId, group);
      fields[group.fieldKey] = ov;
      if (ov.dependencies?.length) {
        dependencies = [...(dependencies ?? []), ...ov.dependencies];
      }
    }

    // Table générique OptionDependency (+ fallback Goodies via sync)
    try {
      const { loadOptionDependencyRulesForArticle } = await import(
        '@/lib/services/option-dependency.service'
      );
      const tableDeps = await loadOptionDependencyRulesForArticle(articleId);
      if (tableDeps.length) {
        dependencies = [...(dependencies ?? []), ...tableDeps];
      }
    } catch {
      /* table absente avant migrate */
    }

    return {
      articleId,
      fields,
      dependencies: dependencies?.length ? dependencies : undefined,
    };
  } catch {
    return { articleId, fields: {} };
  }
}

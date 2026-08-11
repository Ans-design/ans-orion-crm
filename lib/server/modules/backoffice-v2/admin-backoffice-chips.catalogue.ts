/**
 * Fallback catalogue POS — variables depuis config-types quand la DB n'est pas encore synchronisée.
 */
import { CAT_LABELS } from '@/lib/data/catalogue';
import { findCatalogueItem, POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import { getProductConfig } from '@/lib/data/config-types';
import {
  extractOptionGroups,
  type ProductOptionGroupSeed,
} from '@/lib/pricing/config-to-dynamic-pricing';
import type { ChipTableRow } from './admin-backoffice-chips.types';

export const SEED_GROUP_PREFIX = 'seed::';

export function isSeedGroupId(groupId: string): boolean {
  return groupId.startsWith(SEED_GROUP_PREFIX);
}

export function parseSeedGroupId(groupId: string): { articleId: string; fieldKey: string } | null {
  if (!isSeedGroupId(groupId)) return null;
  const parts = groupId.split('::');
  if (parts.length < 3) return null;
  return { articleId: parts[1], fieldKey: parts[2] };
}

export function parseSeedValueId(valueId: string): { articleId: string; fieldKey: string; valueKey: string } | null {
  if (!isSeedGroupId(valueId)) return null;
  const parts = valueId.split('::');
  if (parts.length < 4) return null;
  return { articleId: parts[1], fieldKey: parts[2], valueKey: parts[3] };
}

export function seedGroupId(articleId: string, fieldKey: string): string {
  return `${SEED_GROUP_PREFIX}${articleId}::${fieldKey}`;
}

export function getConfigOptionGroups(articleId: string): ProductOptionGroupSeed[] {
  const cat = findCatalogueItem(articleId);
  if (!cat) return [];
  const cfg = getProductConfig(articleId, cat.configType);
  if (!cfg?.sections?.length) return [];
  return extractOptionGroups(articleId, cfg.sections);
}

export function countConfigChipValues(articleId: string): {
  total: number;
  active: number;
  archived: number;
  priceImpact: number;
  indicative: number;
} {
  const groups = getConfigOptionGroups(articleId);
  let total = 0;
  let active = 0;
  let archived = 0;
  let priceImpact = 0;
  let indicative = 0;

  for (const g of groups) {
    const valueCount = g.values.length || 1;
    total += valueCount;
    if (g.active) {
      active += g.values.filter((v) => v.active).length || 1;
    } else {
      archived += valueCount;
    }
    if (g.impactsPrice && !g.isInformational) priceImpact += valueCount;
    if (g.isInformational) indicative += valueCount;
  }

  return { total, active, archived, priceImpact, indicative };
}

export function mapSeedToRows(
  articleId: string,
  articleLabel: string,
  articleFamily: string,
  group: ProductOptionGroupSeed,
  resolveBlockKey: (sectionTitle: string) => string,
): ChipTableRow[] {
  const blockLabel = group.sectionTitle || 'Général';
  const blockKey = resolveBlockKey(blockLabel);
  const groupId = seedGroupId(articleId, group.fieldKey);

  if (group.values.length === 0) {
    return [{
      id: groupId,
      groupId,
      articleId,
      articleLabel,
      articleFamily,
      blockKey,
      blockLabel,
      fieldKey: group.fieldKey,
      label: group.label,
      active: group.active,
      visiblePos: group.visiblePos,
      impactsPrice: group.impactsPrice && !group.isInformational,
      impactsStock: group.impactsStock,
      impactsProduction: group.impactsProduction,
      isInformational: group.isInformational,
      archived: !group.active,
      priceModifier: 0,
      source: 'catalogue',
      sortOrder: group.sortOrder,
    }];
  }

  return group.values.map((v) => ({
    id: `${groupId}::${v.valueKey}`,
    groupId,
    articleId,
    articleLabel,
    articleFamily,
    blockKey,
    blockLabel,
    fieldKey: group.fieldKey,
    label: v.label,
    active: group.active && v.active,
    visiblePos: group.visiblePos,
    impactsPrice: group.impactsPrice && !group.isInformational,
    impactsStock: group.impactsStock,
    impactsProduction: group.impactsProduction,
    isInformational: group.isInformational,
    archived: !group.active || !v.active,
    priceModifier: v.priceModifier,
    source: 'catalogue',
    sortOrder: group.sortOrder * 1000 + v.sortOrder,
  }));
}

export function resolveArticleMeta(articleId: string) {
  const cat = findCatalogueItem(articleId);
  if (!cat) return null;
  return {
    articleId: cat.id,
    articleLabel: cat.name,
    family: CAT_LABELS[cat.category] ?? cat.category,
    category: cat.category,
    configType: cat.configType,
  };
}

export function listPosCatalogueArticleIds(): string[] {
  return POS_CATALOGUE.map((a) => a.id);
}

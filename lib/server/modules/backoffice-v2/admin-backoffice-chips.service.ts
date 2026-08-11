import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { dualWriteOptionModifier } from '@/lib/money/option-modifier';
import { CAT_LABELS } from '@/lib/data/catalogue';
import { findCatalogueItem, POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import { getProductConfig } from '@/lib/data/config-types';
import { inferCalculationType } from '@/lib/pricing/config-to-dynamic-pricing';
import { scanPricingAnomalies } from '@/lib/pricing/pricing-anomalies';
import {
  mergePriceImpactMetadata,
  resolveFieldPriceImpact,
} from '@/lib/pricing/price-impact-rules';
import { updateProductOptionGroup, updateProductOptionValue } from '@/lib/pricing/update-article-pricing';
import {
  canonicalFamilyLabel,
  validateArticleCategory,
} from '@/lib/pos/article-category-taxonomy';
import {
  countConfigChipValues,
  getConfigOptionGroups,
  isSeedGroupId,
  mapSeedToRows,
  parseSeedGroupId,
  parseSeedValueId,
  resolveArticleMeta,
} from './admin-backoffice-chips.catalogue';
import type {
  ArticleChipsPayload,
  ChipArticleSummary,
  ChipTableRow,
  ChipsGlobalPayload,
  OptionsArticlesListPayload,
} from './admin-backoffice-chips.types';

const BLOCK_MAP: Record<string, string> = {
  dimensions: 'Dimensions',
  dimension: 'Dimensions',
  matiere: 'Matière',
  matière: 'Matière',
  support: 'Matière / Support',
  couleur: 'Couleur',
  impression: 'Impression',
  finition: 'Finition',
  orientation: 'Orientation',
  particularite: 'Particularités',
  particularités: 'Particularités',
  livraison: 'Livraison',
  note: 'Notes',
  notes: 'Notes',
  reliure: 'Reliure',
  face: 'Face',
  format: 'Dimensions',
};

export function resolveBlockKey(sectionTitle: string): string {
  const lower = sectionTitle.toLowerCase().trim();
  for (const [key, label] of Object.entries(BLOCK_MAP)) {
    if (lower.includes(key)) return label;
  }
  return sectionTitle || 'Autre';
}

type GroupWithValues = {
  id: string;
  fieldKey: string;
  label: string;
  sectionTitle: string;
  visiblePos: boolean;
  active: boolean;
  impactsPrice: boolean;
  impactsStock: boolean;
  impactsProduction: boolean;
  isInformational: boolean;
  source: string | null;
  sortOrder: number;
  metadata?: unknown;
  fieldType?: string;
  values: {
    id: string;
    label: string;
    active: boolean;
    priceModifier: number;
    sortOrder: number;
  }[];
};

function readGroupExcelRowId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const id = (metadata as Record<string, unknown>).excelRowId;
  return id != null && String(id).trim() ? String(id).trim() : null;
}

function mapGroupValueToRow(
  articleId: string,
  articleLabel: string,
  articleFamily: string,
  group: GroupWithValues,
): ChipTableRow[] {
  const blockLabel = group.sectionTitle || 'Général';
  const blockKey = resolveBlockKey(blockLabel);
  const excelRowId = readGroupExcelRowId(group.metadata);
  const fieldType = group.fieldType ?? 'select';

  if (group.values.length === 0) {
    return [{
      id: group.id,
      groupId: group.id,
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
      source: group.source ?? 'catalogue',
      sortOrder: group.sortOrder,
      excelRowId,
      fieldType,
    }];
  }

  return group.values.map((v) => ({
    id: v.id,
    groupId: group.id,
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
    source: group.source ?? 'catalogue',
    sortOrder: group.sortOrder * 1000 + v.sortOrder,
    excelRowId,
    fieldType,
  }));
}

function countFromGroups(groups: {
  active: boolean;
  impactsPrice: boolean;
  isInformational: boolean;
  values: { active: boolean }[];
}[]) {
  let variableCount = 0;
  let activeCount = 0;
  let archivedCount = 0;
  let priceImpactCount = 0;
  let indicativeCount = 0;

  for (const g of groups) {
    const valueCount = g.values.length || 1;
    variableCount += valueCount;
    if (g.active) {
      activeCount += g.values.filter((v) => v.active).length || 1;
    } else {
      archivedCount += valueCount;
    }
    if (g.impactsPrice && !g.isInformational) priceImpactCount += valueCount;
    if (g.isInformational) indicativeCount += valueCount;
  }

  return { variableCount, activeCount, archivedCount, priceImpactCount, indicativeCount };
}

function buildBlocksFromRows(rows: ChipTableRow[]) {
  const blockMap = new Map<string, ChipTableRow[]>();
  for (const row of rows) {
    const list = blockMap.get(row.blockKey) ?? [];
    list.push(row);
    blockMap.set(row.blockKey, list);
  }

  return [...blockMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([blockKey, blockRows]) => ({
      blockKey,
      blockLabel: blockRows[0]?.blockLabel ?? blockKey,
      rows: blockRows.sort((a, b) => a.sortOrder - b.sortOrder),
    }));
}

function countRows(rows: ChipTableRow[]) {
  return {
    total: rows.length,
    active: rows.filter((r) => r.active && !r.archived).length,
    archived: rows.filter((r) => r.archived).length,
    priceImpact: rows.filter((r) => r.impactsPrice).length,
    indicative: rows.filter((r) => r.isInformational).length,
  };
}

async function loadDbGroupsForArticle(articleId: string, includeArchived: boolean) {
  return prisma.productOptionGroup.findMany({
    where: {
      articleId,
      ...(includeArchived ? {} : { active: true }),
    },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    include: {
      values: { orderBy: { sortOrder: 'asc' } },
    },
  });
}

function buildRowsFromConfig(
  articleId: string,
  articleLabel: string,
  articleFamily: string,
  existingFieldKeys: Set<string>,
): ChipTableRow[] {
  const seeds = getConfigOptionGroups(articleId);
  const rows: ChipTableRow[] = [];
  for (const seed of seeds) {
    if (existingFieldKeys.has(seed.fieldKey)) continue;
    rows.push(...mapSeedToRows(articleId, articleLabel, articleFamily, seed, resolveBlockKey));
  }
  return rows;
}

type ProfileSummary = {
  articleId: string;
  articleLabel: string;
  family: string;
  status: string;
  active: boolean;
  optionGroups: {
    active: boolean;
    impactsPrice: boolean;
    isInformational: boolean;
    visiblePos: boolean;
    values: { active: boolean }[];
  }[];
};

type DbGroupSummary = {
  articleId: string;
  active: boolean;
  impactsPrice: boolean;
  isInformational: boolean;
  visiblePos: boolean;
  values: { active: boolean }[];
};

type GroupWithProfile = GroupWithValues & {
  articleId: string;
  profile: { articleLabel: string; family: string };
};

export async function listChipArticles(params: {
  search?: string;
  family?: string;
  category?: string;
  status?: string;
  includeInactive?: boolean;
  onlyWithChips?: boolean;
  onlyWithAnomalies?: boolean;
} = {}): Promise<OptionsArticlesListPayload> {
  let profiles: ProfileSummary[] = [];
  let dbGroups: DbGroupSummary[] = [];
  let anomalies: Awaited<ReturnType<typeof scanPricingAnomalies>> = [];

  try {
    [profiles, dbGroups, anomalies] = await Promise.all([
      prisma.articlePricingProfile.findMany({
        select: {
          articleId: true,
          articleLabel: true,
          family: true,
          status: true,
          active: true,
          optionGroups: {
            select: {
              active: true,
              impactsPrice: true,
              isInformational: true,
              visiblePos: true,
              values: { select: { active: true } },
            },
          },
        },
      }),
      prisma.productOptionGroup.findMany({
        select: {
          articleId: true,
          active: true,
          impactsPrice: true,
          isInformational: true,
          visiblePos: true,
          values: { select: { active: true } },
        },
      }),
      scanPricingAnomalies(500),
    ]);
  } catch {
    profiles = [];
    dbGroups = [];
    anomalies = [];
  }

  const profileMap = new Map(profiles.map((p) => [p.articleId, p]));
  const groupsByArticle = new Map<string, typeof dbGroups>();
  for (const g of dbGroups) {
    const list = groupsByArticle.get(g.articleId) ?? [];
    list.push(g);
    groupsByArticle.set(g.articleId, list);
  }

  const anomalyByArticle = new Map<string, number>();
  for (const a of anomalies) {
    if (!a.articleId) continue;
    anomalyByArticle.set(a.articleId, (anomalyByArticle.get(a.articleId) ?? 0) + 1);
  }

  const seen = new Set<string>();
  const articles: ChipArticleSummary[] = [];

  const pushArticle = (articleId: string, base: {
    articleLabel: string;
    family: string;
    category: string;
    status: string;
    active: boolean;
    visiblePos: boolean;
  }) => {
    if (seen.has(articleId)) return;
    seen.add(articleId);

    const profile = profileMap.get(articleId);
    const groups = groupsByArticle.get(articleId) ?? profile?.optionGroups ?? [];
    let counts = countFromGroups(groups);

    let dataSource: ChipArticleSummary['dataSource'] = groups.length > 0 ? 'database' : 'catalogue';
    if (counts.variableCount === 0) {
      const configCounts = countConfigChipValues(articleId);
      if (configCounts.total > 0) {
        counts = {
          variableCount: configCounts.total,
          activeCount: configCounts.active,
          archivedCount: configCounts.archived,
          priceImpactCount: configCounts.priceImpact,
          indicativeCount: configCounts.indicative,
        };
        dataSource = groups.length > 0 ? 'hybrid' : 'catalogue';
      }
    } else if (countConfigChipValues(articleId).total > counts.variableCount) {
      dataSource = 'hybrid';
    }

    const family = profile?.family ?? base.family;
    const categoryValidation = validateArticleCategory({
      articleId,
      name: profile?.articleLabel ?? base.articleLabel,
      family,
      category: base.category,
    });
    const categoryId = categoryValidation.suggestedCategoryId;
    const categoryNeedsReview = categoryValidation.needsReview;
    const catAnomalyBoost = categoryNeedsReview ? 1 : 0;

    articles.push({
      articleId,
      articleLabel: profile?.articleLabel ?? base.articleLabel,
      family,
      category: categoryId,
      categoryId,
      categoryNeedsReview,
      suggestedCategory: canonicalFamilyLabel(categoryId),
      status: profile?.status ?? base.status,
      active: profile?.active ?? base.active,
      visiblePos: base.visiblePos,
      ...counts,
      anomalyCount: (anomalyByArticle.get(articleId) ?? 0) + catAnomalyBoost,
      dataSource,
      articleType: base.category,
      priceMode: '',
    });
  };

  for (const cat of POS_CATALOGUE) {
    const profile = profileMap.get(cat.id);
    const groups = groupsByArticle.get(cat.id) ?? [];
    pushArticle(cat.id, {
      articleLabel: profile?.articleLabel ?? cat.name,
      family: profile?.family ?? CAT_LABELS[cat.category] ?? cat.category,
      category: cat.category,
      status: profile?.status ?? 'catalogue',
      active: profile?.active ?? true,
      visiblePos: groups.length === 0
        ? true
        : groups.some((g) => g.visiblePos),
    });
  }

  for (const profile of profiles) {
    const cat = findCatalogueItem(profile.articleId);
    pushArticle(profile.articleId, {
      articleLabel: profile.articleLabel,
      family: profile.family,
      category: cat?.category ?? profile.family,
      status: profile.status,
      active: profile.active,
      visiblePos: profile.optionGroups.some((g) => g.visiblePos) || profile.active,
    });
  }

  let filtered = articles.sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr'));

  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (a) => a.articleId.toLowerCase().includes(q)
        || a.articleLabel.toLowerCase().includes(q)
        || a.family.toLowerCase().includes(q),
    );
  }
  if (params.family && params.family !== 'all') {
    filtered = filtered.filter((a) => a.family === params.family || a.category === params.family);
  }
  if (params.category && params.category !== 'all') {
    if (params.category === 'incoherent' || params.category === 'review') {
      filtered = filtered.filter((a) => a.categoryNeedsReview);
    } else {
      filtered = filtered.filter(
        (a) => a.category === params.category || a.categoryId === params.category,
      );
    }
  }
  if (params.status && params.status !== 'all') {
    if (params.status === 'review' || params.status === 'incoherent') {
      filtered = filtered.filter((a) => a.categoryNeedsReview);
    } else {
      filtered = filtered.filter((a) => a.status === params.status);
    }
  }
  if (!params.includeInactive) {
    filtered = filtered.filter((a) => a.active);
  }
  if (params.onlyWithChips) {
    filtered = filtered.filter((a) => a.variableCount > 0);
  }
  if (params.onlyWithAnomalies) {
    filtered = filtered.filter((a) => a.anomalyCount > 0);
  }

  const stats = {
    totalArticles: filtered.length,
    articlesWithChips: filtered.filter((a) => a.variableCount > 0).length,
    totalChips: filtered.reduce((s, a) => s + a.variableCount, 0),
    activeChips: filtered.reduce((s, a) => s + a.activeCount, 0),
    archivedChips: filtered.reduce((s, a) => s + a.archivedCount, 0),
    pricingChips: filtered.reduce((s, a) => s + a.priceImpactCount, 0),
    indicativeChips: filtered.reduce((s, a) => s + a.indicativeCount, 0),
  };

  return { articles: filtered, stats };
}

export async function getArticleChips(
  articleId: string,
  params: { includeArchived?: boolean } = {},
): Promise<ArticleChipsPayload | null> {
  const meta = resolveArticleMeta(articleId);
  const profile = await prisma.articlePricingProfile.findUnique({
    where: { articleId },
    select: {
      articleId: true,
      articleLabel: true,
      family: true,
      status: true,
      active: true,
    },
  }).catch(() => null);

  if (!meta && !profile) return null;

  const articleLabel = profile?.articleLabel ?? meta?.articleLabel ?? articleId;
  const family = profile?.family ?? meta?.family ?? 'Autre';
  const status = profile?.status ?? 'catalogue';

  const dbGroups = await loadDbGroupsForArticle(articleId, params.includeArchived === true).catch(() => [] as Awaited<ReturnType<typeof loadDbGroupsForArticle>>);
  const existingFieldKeys = new Set(dbGroups.map((g) => g.fieldKey));

  const rows: ChipTableRow[] = [];
  for (const g of dbGroups) {
    rows.push(...mapGroupValueToRow(articleId, articleLabel, family, g));
  }

  rows.push(...buildRowsFromConfig(articleId, articleLabel, family, existingFieldKeys));

  let filtered = rows;
  if (!params.includeArchived) {
    filtered = filtered.filter((r) => !r.archived);
  }

  return {
    article: { articleId, articleLabel, family, status },
    counts: countRows(filtered),
    blocks: buildBlocksFromRows(filtered),
    rows: filtered,
  };
}

export async function getGlobalChips(params: {
  search?: string;
  articleId?: string;
  block?: string;
  status?: string;
  impact?: string;
  includeArchived?: boolean;
  limit?: number;
}): Promise<ChipsGlobalPayload> {
  const limit = Math.min(3000, params.limit ?? 500);

  const groupWhere: Prisma.ProductOptionGroupWhereInput = {};
  if (params.articleId && params.articleId !== 'all') {
    groupWhere.articleId = params.articleId;
  }
  if (!params.includeArchived) {
    groupWhere.active = true;
  }
  if (params.impact === 'price') {
    groupWhere.impactsPrice = true;
    groupWhere.isInformational = false;
  } else if (params.impact === 'indicative') {
    groupWhere.isInformational = true;
  }
  if (params.block && params.block !== 'all') {
    groupWhere.sectionTitle = { contains: params.block };
  }
  if (params.search?.trim()) {
    const q = params.search.trim();
    groupWhere.OR = [
      { articleId: { contains: q } },
      { label: { contains: q } },
      { fieldKey: { contains: q } },
      { profile: { articleLabel: { contains: q } } },
    ];
  }

  let groups: GroupWithProfile[] = [];
  try {
    groups = await prisma.productOptionGroup.findMany({
      where: groupWhere,
      take: limit,
      orderBy: [{ articleId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        values: { orderBy: { sortOrder: 'asc' } },
        profile: { select: { articleLabel: true, family: true } },
      },
    });
  } catch {
    groups = [];
  }

  const rows: ChipTableRow[] = [];
  const articlesWithDb = new Set<string>();

  for (const g of groups) {
    articlesWithDb.add(g.articleId);
    rows.push(
      ...mapGroupValueToRow(
        g.articleId,
        g.profile?.articleLabel ?? g.articleId,
        g.profile?.family ?? 'Autre',
        g,
      ),
    );
  }

  const targetArticles = params.articleId && params.articleId !== 'all'
    ? POS_CATALOGUE.filter((a) => a.id === params.articleId)
    : POS_CATALOGUE;

  for (const cat of targetArticles) {
    if (articlesWithDb.has(cat.id)) continue;
    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      if (!cat.id.toLowerCase().includes(q) && !cat.name.toLowerCase().includes(q)) continue;
    }
    const family = CAT_LABELS[cat.category] ?? cat.category;
    const configRows = buildRowsFromConfig(cat.id, cat.name, family, new Set());
    if (params.block && params.block !== 'all') {
      const blockQ = params.block.toLowerCase();
      const filteredConfig = configRows.filter(
        (r) => r.blockKey.toLowerCase().includes(blockQ) || r.blockLabel.toLowerCase().includes(blockQ),
      );
      rows.push(...filteredConfig);
    } else {
      rows.push(...configRows);
    }
  }

  let filtered = rows;
  if (params.status === 'active') filtered = filtered.filter((r) => r.active && !r.archived);
  if (params.status === 'archived') filtered = filtered.filter((r) => r.archived);
  if (!params.includeArchived) filtered = filtered.filter((r) => !r.archived);
  if (params.impact === 'price') filtered = filtered.filter((r) => r.impactsPrice);
  if (params.impact === 'indicative') filtered = filtered.filter((r) => r.isInformational);

  const limited = filtered.slice(0, limit);
  return { rows: limited, total: filtered.length };
}

async function ensureArticleProfile(articleId: string) {
  const existing = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
  if (existing) return existing;

  const meta = resolveArticleMeta(articleId);
  if (!meta) throw new Error('Article introuvable');

  const cat = findCatalogueItem(articleId)!;
  const cfg = getProductConfig(articleId, cat.configType);

  return prisma.articlePricingProfile.create({
    data: {
      articleId,
      articleLabel: meta.articleLabel,
      family: meta.family,
      calculationType: cfg ? inferCalculationType(articleId, cfg) : 'piece',
      saleUnit: cat.unit ?? 'pièce',
      status: 'draft',
      prixBase: cfg?.prixBase ?? cat.prixDepart,
      active: true,
      source: 'options-chips-ensure',
    },
  });
}

async function ensureDbGroupFromSeed(articleId: string, fieldKey: string): Promise<string> {
  const existing = await prisma.productOptionGroup.findUnique({
    where: { articleId_fieldKey: { articleId, fieldKey } },
    select: { id: true },
  });
  if (existing) return existing.id;

  await ensureArticleProfile(articleId);
  const seed = getConfigOptionGroups(articleId).find((g) => g.fieldKey === fieldKey);
  if (!seed) throw new Error('Variable introuvable dans le catalogue');

  const effectiveImpact = resolveFieldPriceImpact({
    articleId,
    fieldKey: seed.fieldKey,
    metadata: seed.metadata,
    defaultImpactsPrice: seed.impactsPrice,
    defaultIsInformational: seed.isInformational,
  });
  const mergedMetadata = mergePriceImpactMetadata(seed.metadata ?? {}, effectiveImpact);

  const row = await prisma.productOptionGroup.create({
    data: {
      articleId,
      fieldKey: seed.fieldKey,
      label: seed.label,
      sectionTitle: seed.sectionTitle,
      sectionIcon: seed.sectionIcon,
      fieldType: seed.fieldType,
      sortOrder: seed.sortOrder,
      visiblePos: seed.visiblePos,
      active: seed.active,
      required: seed.required,
      impactsPrice: effectiveImpact.impactsPrice,
      impactsStock: seed.impactsStock,
      impactsProduction: seed.impactsProduction,
      isInformational: effectiveImpact.isInformational,
      requiresAdminValidation: seed.requiresAdminValidation,
      metadata: mergedMetadata as Prisma.InputJsonValue,
      source: 'catalogue',
    },
  });

  if (seed.values.length) {
    await prisma.productOptionValue.createMany({
      data: seed.values.map((v) => {
        const dual = dualWriteOptionModifier(v.modifierType, v.priceModifier);
        return {
          groupId: row.id,
          valueKey: v.valueKey,
          label: v.label,
          sortOrder: v.sortOrder,
          priceModifier: dual.priceModifier,
          priceAddonAr: dual.priceAddonAr,
          priceMultiplier: dual.priceMultiplier,
          modifierType: v.modifierType,
          forcePrice: v.forcePrice,
          active: v.active,
          metadata: v.metadata as Prisma.InputJsonValue | undefined,
        };
      }),
    });
  }

  return row.id;
}

async function ensureDbValueFromSeed(
  articleId: string,
  fieldKey: string,
  valueKey: string,
): Promise<string> {
  const groupId = await ensureDbGroupFromSeed(articleId, fieldKey);
  const existing = await prisma.productOptionValue.findFirst({
    where: { groupId, valueKey },
    select: { id: true },
  });
  if (existing) return existing.id;

  const seed = getConfigOptionGroups(articleId)
    .find((g) => g.fieldKey === fieldKey)
    ?.values.find((v) => v.valueKey === valueKey);
  if (!seed) throw new Error('Valeur introuvable dans le catalogue');

  const dual = dualWriteOptionModifier(seed.modifierType, seed.priceModifier);
  const created = await prisma.productOptionValue.create({
    data: {
      groupId,
      valueKey: seed.valueKey,
      label: seed.label,
      sortOrder: seed.sortOrder,
      priceModifier: dual.priceModifier,
      priceAddonAr: dual.priceAddonAr,
      priceMultiplier: dual.priceMultiplier,
      modifierType: seed.modifierType,
      forcePrice: seed.forcePrice,
      active: seed.active,
      metadata: seed.metadata as Prisma.InputJsonValue | undefined,
    },
  });
  return created.id;
}

/** Crée une variable/chip depuis Excel quand elle n'existe pas encore (seed ou manuelle). */
export async function createChipGroupFromExcel(input: {
  articleId: string;
  fieldKey: string;
  label: string;
  fieldType?: string;
  sortOrder?: number;
  visiblePos?: boolean;
  active?: boolean;
  impactsPrice?: boolean;
  isInformational?: boolean;
  excelRowId?: string | null;
  priceModifier?: number | null;
}): Promise<string> {
  const fieldKey = input.fieldKey.trim();
  if (!fieldKey) throw new Error('CHAMP requis pour créer une variable');

  const existing = await prisma.productOptionGroup.findUnique({
    where: { articleId_fieldKey: { articleId: input.articleId, fieldKey } },
    select: { id: true },
  });
  if (existing) return existing.id;

  try {
    return await ensureDbGroupFromSeed(input.articleId, fieldKey);
  } catch {
    /* pas de seed catalogue — création manuelle */
  }

  await ensureArticleProfile(input.articleId);

  const metadata: Record<string, unknown> = {};
  if (input.excelRowId) metadata.excelRowId = input.excelRowId;

  const row = await prisma.productOptionGroup.create({
    data: {
      articleId: input.articleId,
      fieldKey,
      label: input.label || fieldKey,
      sectionTitle: 'Options',
      fieldType: input.fieldType ?? 'select',
      sortOrder: input.sortOrder ?? 0,
      visiblePos: input.visiblePos ?? true,
      active: input.active ?? true,
      required: false,
      impactsPrice: input.impactsPrice ?? false,
      impactsStock: false,
      impactsProduction: false,
      isInformational: input.isInformational ?? !input.impactsPrice,
      metadata: Object.keys(metadata).length ? (metadata as Prisma.InputJsonValue) : undefined,
      source: 'excel-import',
    },
  });

  if (input.priceModifier != null && !Number.isNaN(input.priceModifier)) {
    const dual = dualWriteOptionModifier('piece', input.priceModifier);
    await prisma.productOptionValue.create({
      data: {
        groupId: row.id,
        valueKey: 'default',
        label: input.label || fieldKey,
        sortOrder: 0,
        priceModifier: dual.priceModifier,
        priceAddonAr: dual.priceAddonAr,
        priceMultiplier: dual.priceMultiplier,
        modifierType: 'piece',
        active: true,
      },
    });
  }

  return row.id;
}

export async function patchChipGroup(
  groupId: string,
  data: Partial<{
    impactsPrice: boolean;
    impactsStock: boolean;
    impactsProduction: boolean;
    isInformational: boolean;
    visiblePos: boolean;
    active: boolean;
    required: boolean;
    label: string;
  }>,
) {
  let realGroupId = groupId;
  if (isSeedGroupId(groupId)) {
    const parsed = parseSeedGroupId(groupId);
    if (!parsed) throw new Error('Identifiant variable invalide');
    realGroupId = await ensureDbGroupFromSeed(parsed.articleId, parsed.fieldKey);
  }

  const group = await prisma.productOptionGroup.findUnique({
    where: { id: realGroupId },
    select: { articleId: true },
  });
  if (!group) throw new Error('Variable introuvable');

  if (data.isInformational === true) {
    data.impactsPrice = false;
  }
  if (data.impactsPrice === true) {
    data.isInformational = false;
  }

  const { label, ...flags } = data;
  const updated = await updateProductOptionGroup(realGroupId, group.articleId, flags);

  if (label !== undefined) {
    await prisma.productOptionGroup.update({
      where: { id: realGroupId },
      data: { label },
    });
  }

  return updated;
}

export async function patchChipValue(
  valueId: string,
  data: Partial<{ active: boolean; label: string; priceModifier: number }>,
) {
  let realValueId = valueId;

  if (isSeedGroupId(valueId)) {
    const parsed = parseSeedValueId(valueId);
    if (!parsed) throw new Error('Identifiant valeur invalide');
    realValueId = await ensureDbValueFromSeed(parsed.articleId, parsed.fieldKey, parsed.valueKey);
  } else {
    const existing = await prisma.productOptionValue.findUnique({
      where: { id: valueId },
      select: { id: true },
    });
    if (!existing) throw new Error('Valeur option introuvable');
  }

  const value = await prisma.productOptionValue.findUnique({
    where: { id: realValueId },
    select: { id: true, groupId: true },
  });
  if (!value) throw new Error('Valeur option introuvable');

  return updateProductOptionValue(realValueId, value.groupId, data);
}

export async function patchChipById(
  chipId: string,
  data: Partial<{
    impactsPrice: boolean;
    impactsStock: boolean;
    impactsProduction: boolean;
    isInformational: boolean;
    visiblePos: boolean;
    active: boolean;
    required: boolean;
    label: string;
    priceModifier: number;
  }>,
) {
  if (isSeedGroupId(chipId) && chipId.split('::').length >= 4) {
    const { active, label, priceModifier, ...groupOnly } = data;
    if (Object.keys(groupOnly).length > 0) {
      throw new Error('Les flags groupe ne s\'appliquent pas à une valeur individuelle');
    }
    return patchChipValue(chipId, { active, label, priceModifier });
  }

  const value = await prisma.productOptionValue.findUnique({
    where: { id: chipId },
    select: { id: true, groupId: true },
  });

  if (value) {
    const { active, label, priceModifier, ...groupOnly } = data;
    if (Object.keys(groupOnly).length > 0) {
      throw new Error('Les flags groupe ne s\'appliquent pas à une valeur individuelle');
    }
    return patchChipValue(chipId, { active, label, priceModifier });
  }

  return patchChipGroup(chipId, data);
}

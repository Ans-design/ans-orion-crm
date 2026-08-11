import { prisma } from '@/lib/prisma';
import { CAT_LABELS } from '@/lib/data/catalogue';
import { findCatalogueItem, POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import { getProductConfig } from '@/lib/data/config-types';
import { publishArticleDynamicPricing } from '@/lib/pricing/publish-dynamic-pricing';
import { simulateTierLines } from '@/lib/server/modules/pricing/price-tier-simulator.service';
import {
  inferTierMode,
  validatePriceTiers,
  type TierInput,
} from '@/lib/server/modules/pricing/price-tier.validation';
import { replaceArticleDiscountTiers } from '@/lib/pricing/update-article-pricing';
import { chainDiscountTierMins } from '@/lib/pricing/validate-discount-tiers';
import { scanPricingAnomalies } from '@/lib/pricing/pricing-anomalies';
import { formatTiersSummary } from './admin-backoffice.mapper';
import {
  getConfigTiers,
  resolveArticleMeta,
} from './admin-backoffice-tiers.catalogue';
import type {
  ArticleTiersPayload,
  TierArticleSummary,
  TierMode,
  TierPublicationStatus,
  TierTableRow,
  TiersArticlesListPayload,
  TiersGlobalPayload,
} from './admin-backoffice-tiers.types';

function mapDbTier(
  articleId: string,
  t: {
    id: string;
    minQty: number;
    maxQty: number | null;
    unitPrice: number | null;
    discountPercent: number;
    active: boolean;
    source: string | null;
    variantKey?: string | null;
    variantLabel?: string | null;
  },
  mode: TierMode,
  sortOrder: number,
): TierTableRow {
  const value = mode === 'percent' ? t.discountPercent : t.unitPrice;
  return {
    id: t.id,
    articleId,
    variantKey: t.variantKey ?? '',
    variantLabel: t.variantLabel ?? null,
    minQty: t.minQty,
    maxQty: t.maxQty,
    value,
    unitPrice: t.unitPrice,
    discountPercent: t.discountPercent,
    mode,
    active: t.active,
    source: t.source,
    sortOrder,
  };
}

function resolvePublicationStatus(status: string | undefined): TierPublicationStatus {
  if (status === 'published') return 'published';
  if (status === 'draft') return 'draft';
  if (status === 'catalogue') return 'catalogue';
  return 'none';
}

async function ensureArticleProfile(articleId: string) {
  const existing = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
  if (existing) return existing;
  const meta = resolveArticleMeta(articleId);
  if (!meta) throw new Error('Article introuvable');
  const cat = findCatalogueItem(articleId)!;
  const configTiers = getConfigTiers(articleId);
  await prisma.articlePricingProfile.create({
    data: {
      articleId,
      articleLabel: meta.articleLabel,
      family: meta.family,
      calculationType: configTiers.calculationType,
      saleUnit: configTiers.saleUnit,
      status: 'draft',
      prixBase: configTiers.prixBase ?? cat.prixDepart,
      qtyMin: configTiers.qtyMin,
      active: true,
      source: 'tiers-ensure',
    },
  });
  if (configTiers.tiers.length) {
    await replaceArticleDiscountTiers(
      articleId,
      configTiers.tiers.map((t) => ({
        minQty: t.minQty,
        maxQty: t.maxQty,
        unitPrice: t.unitPrice,
        discountPercent: t.discountPercent,
        active: true,
      })),
    );
  }
  return prisma.articlePricingProfile.findUnique({ where: { articleId } });
}

export async function listTierArticles(params: {
  search?: string;
  category?: string;
  includeInactive?: boolean;
  onlyWithTiers?: boolean;
  onlyWithoutTiers?: boolean;
  onlyWithAnomalies?: boolean;
} = {}): Promise<TiersArticlesListPayload> {
  let profiles: {
    articleId: string;
    articleLabel: string;
    family: string;
    status: string;
    active: boolean;
    calculationType: string;
    saleUnit: string;
    qtyMin: number | null;
    updatedAt: Date;
    discountTiers: { minQty: number; maxQty: number | null; unitPrice: number | null; active: boolean }[];
  }[] = [];
  let anomalies: Awaited<ReturnType<typeof scanPricingAnomalies>> = [];

  try {
    [profiles, anomalies] = await Promise.all([
      prisma.articlePricingProfile.findMany({
        select: {
          articleId: true,
          articleLabel: true,
          family: true,
          status: true,
          active: true,
          calculationType: true,
          saleUnit: true,
          qtyMin: true,
          updatedAt: true,
          discountTiers: {
            select: { minQty: true, maxQty: true, unitPrice: true, active: true },
            orderBy: { minQty: 'asc' },
          },
        },
      }),
      scanPricingAnomalies(500),
    ]);
  } catch {
    profiles = [];
    anomalies = [];
  }

  const profileMap = new Map(profiles.map((p) => [p.articleId, p]));
  const anomalyByArticle = new Map<string, number>();
  for (const a of anomalies) {
    if (!a.articleId) continue;
    anomalyByArticle.set(a.articleId, (anomalyByArticle.get(a.articleId) ?? 0) + 1);
  }

  const articles: TierArticleSummary[] = [];

  for (const cat of POS_CATALOGUE) {
    const profile = profileMap.get(cat.id);
    const configTiers = getConfigTiers(cat.id);
    const dbTiers = profile?.discountTiers ?? [];
    let tierCount = dbTiers.length;
    let dataSource: TierArticleSummary['dataSource'] = tierCount > 0 ? 'database' : 'none';
    if (tierCount === 0 && configTiers.tiers.length > 0) {
      tierCount = configTiers.tiers.length;
      dataSource = 'catalogue';
    } else if (tierCount > 0 && configTiers.tiers.length > tierCount) {
      dataSource = 'hybrid';
    }

    const activeTierCount = dbTiers.filter((t) => t.active).length || configTiers.tiers.length;
    const summary = dbTiers.length
      ? formatTiersSummary(dbTiers)
      : configTiers.tiers.length
        ? `${configTiers.tiers.length} paliers (catalogue)`
        : 'Sans palier';

    articles.push({
      articleId: cat.id,
      articleLabel: profile?.articleLabel ?? cat.name,
      family: profile?.family ?? CAT_LABELS[cat.category] ?? cat.category,
      category: cat.category,
      status: profile?.status ?? 'catalogue',
      active: profile?.active ?? true,
      visiblePos: profile?.active ?? true,
      calculationType: profile?.calculationType ?? configTiers.calculationType,
      saleUnit: profile?.saleUnit ?? configTiers.saleUnit,
      qtyMin: profile?.qtyMin ?? configTiers.qtyMin,
      tierCount,
      activeTierCount,
      tiersSummary: summary,
      publicationStatus: resolvePublicationStatus(profile?.status),
      anomalyCount: anomalyByArticle.get(cat.id) ?? 0,
      dataSource,
      updatedAt: profile?.updatedAt?.toISOString() ?? null,
    });
  }

  let filtered = articles;
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.articleLabel.toLowerCase().includes(q) ||
        a.articleId.toLowerCase().includes(q) ||
        a.family.toLowerCase().includes(q),
    );
  }
  if (params.category && params.category !== 'all') {
    filtered = filtered.filter((a) => a.category === params.category);
  }
  if (!params.includeInactive) {
    filtered = filtered.filter((a) => a.active);
  }
  if (params.onlyWithTiers) {
    filtered = filtered.filter((a) => a.tierCount > 0);
  }
  if (params.onlyWithoutTiers) {
    filtered = filtered.filter((a) => a.tierCount === 0);
  }
  if (params.onlyWithAnomalies) {
    filtered = filtered.filter((a) => a.anomalyCount > 0);
  }

  filtered.sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr'));

  return {
    articles: filtered,
    stats: {
      totalArticles: filtered.length,
      articlesWithTiers: filtered.filter((a) => a.tierCount > 0).length,
      totalTiers: filtered.reduce((s, a) => s + a.tierCount, 0),
      activeTiers: filtered.reduce((s, a) => s + a.activeTierCount, 0),
      withoutTiers: filtered.filter((a) => a.tierCount === 0).length,
    },
  };
}

export async function getArticleTiers(articleId: string): Promise<ArticleTiersPayload | null> {
  const meta = resolveArticleMeta(articleId);
  if (!meta) return null;

  const configTiers = getConfigTiers(articleId);
  const profile = await prisma.articlePricingProfile.findUnique({
    where: { articleId },
    include: { discountTiers: { orderBy: { minQty: 'asc' } } },
  }).catch(() => null);

  let dbTiers = profile?.discountTiers ?? [];
  if (!dbTiers.length && configTiers.tiers.length) {
    dbTiers = configTiers.tiers.map((t, i) => ({
      id: `seed::${articleId}::${i}`,
      articleId,
      variantKey: '',
      variantLabel: null,
      minQty: t.minQty,
      maxQty: t.maxQty,
      unitPrice: t.unitPrice,
      discountPercent: t.discountPercent,
      active: true,
      source: 'catalogue',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  const { getPrix2026EntryUnitPrice, getPrix2026SheetLabel } = await import(
    '@/lib/data/prix-2026-grids'
  );
  const { isPrix2026LegacyEnabled } = await import('@/lib/pricing/prix-2026-legacy');
  const excelEntry = isPrix2026LegacyEnabled() ? getPrix2026EntryUnitPrice(articleId) : null;
  const excelSheet = isPrix2026LegacyEnabled() ? getPrix2026SheetLabel(articleId) : null;
  const resolvedPrixBase =
    excelEntry != null && excelEntry > 0
      ? excelEntry
      : profile?.prixBase ?? configTiers.prixBase;

  // Persiste l’entrée de gamme Excel uniquement en mode legacy (jamais STRICT/prod).
  if (
    isPrix2026LegacyEnabled()
    && excelEntry != null
    && excelEntry > 0
    && profile
    && (profile.prixBase == null || profile.prixBase !== excelEntry)
  ) {
    await prisma.articlePricingProfile
      .update({
        where: { articleId },
        data: { prixBase: excelEntry, source: 'prix-2026-excel', updatedAt: new Date() },
      })
      .catch(() => null);
  }

  const tierMode = inferTierMode(dbTiers);
  const tiers = dbTiers.map((t, i) => mapDbTier(articleId, t, tierMode, i));

  const variantMap = new Map<
    string,
    { label: string; count: number; listPrixBase: number | null; sig: string }
  >();
  const { resolveArticleVariantListPrice } = await import('@/lib/pricing/prix-2026-gf-list-prices');
  const { isPreferredDefaultVariant } = await import('@/lib/pricing/ans-palier-remise-map');

  const sigOf = (rows: typeof tiers) =>
    rows
      .map((t) => `${t.minQty}-${t.maxQty ?? '∞'}:${t.discountPercent}`)
      .join('|');

  const tiersByVk = new Map<string, typeof tiers>();
  for (const t of tiers) {
    const key = t.variantKey ?? '';
    if (!tiersByVk.has(key)) tiersByVk.set(key, []);
    tiersByVk.get(key)!.push(t);
  }

  for (const [key, rows] of tiersByVk) {
    const label = rows[0]?.variantLabel || (key ? key : 'Défaut produit');
    const fromTier =
      rows.find((t) => t.discountPercent === 0 && t.unitPrice != null && t.unitPrice > 0)
        ?.unitPrice ?? null;
    const fromList = resolveArticleVariantListPrice(
      articleId,
      key,
      profile?.family ?? meta.family ?? '',
    );
    variantMap.set(key, {
      label,
      count: rows.length,
      listPrixBase: fromTier ?? fromList ?? null,
      sig: sigOf(rows),
    });
  }

  // UI : fusionner défaut / __art-* / même format (sable≈transparent), garder formats distincts
  const { formatKeyFromVariant } = await import('@/lib/pricing/prix-2026-gf-list-prices');
  const canCollapseKeys = (a: string, b: string) => {
    if (!a || !b) return true;
    if (/__art-/i.test(a) || /__art-/i.test(b)) return true;
    const fa = formatKeyFromVariant(a);
    const fb = formatKeyFromVariant(b);
    if (fa && fb && fa === fb) return true;
    return false;
  };

  const groups = new Map<string, string[]>();
  for (const [key, v] of variantMap) {
    let groupId: string | null = null;
    for (const [gid, members] of groups) {
      const head = members[0]!;
      const headV = variantMap.get(head)!;
      if (headV.sig !== v.sig) continue;
      if (!canCollapseKeys(key, head)) continue;
      groupId = gid;
      break;
    }
    if (!groupId) {
      groupId = `g:${key}`;
      groups.set(groupId, [key]);
    } else {
      groups.get(groupId)!.push(key);
    }
  }

  const pickCanon = (keys: string[]) => {
    const sorted = [...keys].sort((a, b) => {
      const pa = isPreferredDefaultVariant(a, articleId) ? 0 : 1;
      const pb = isPreferredDefaultVariant(b, articleId) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (a && !b) return -1;
      if (!a && b) return 1;
      if (/__art-/i.test(a) !== /__art-/i.test(b)) return /__art-/i.test(a) ? 1 : -1;
      return a.localeCompare(b);
    });
    return sorted[0]!;
  };

  const variants = [...groups.values()]
    .map((keys) => {
      const variantKey = pickCanon(keys);
      const v = variantMap.get(variantKey)!;
      const aliases = keys
        .filter((k) => k !== variantKey)
        .map((k) => variantMap.get(k)?.label || k);
      return {
        variantKey,
        variantLabel:
          aliases.length > 0 ? `${v.label} · même grille (+${aliases.length})` : v.label,
        tierCount: v.count,
        listPrixBase: v.listPrixBase,
      };
    })
    .sort((a, b) => {
      if (a.variantKey === '') return -1;
      if (b.variantKey === '') return 1;
      return a.variantLabel.localeCompare(b.variantLabel, 'fr');
    });

  // Valider / simuler la grille défaut ("" en premier) — pas le mélange multi-variantes
  const defaultKey =
    variants.find((v) => v.variantKey === '')?.variantKey
    ?? variants[0]?.variantKey
    ?? '';
  const tiersForValidation = tiers.filter((t) => (t.variantKey ?? '') === defaultKey);
  const validation = validatePriceTiers(
    tiersForValidation.map((t) => ({
      id: t.id,
      minQty: t.minQty,
      maxQty: t.maxQty,
      unitPrice: t.unitPrice,
      discountPercent: t.discountPercent,
      active: t.active,
    })),
    { tierMode, qtyMin: profile?.qtyMin ?? configTiers.qtyMin },
  );
  const simulations = simulateTierLines(
    tiersForValidation,
    tierMode,
    resolvedPrixBase,
    profile?.saleUnit ?? configTiers.saleUnit,
    profile?.qtyMin ?? configTiers.qtyMin,
  );

  return {
    article: {
      articleId,
      articleLabel: profile?.articleLabel ?? meta.articleLabel,
      family: profile?.family ?? meta.family,
      category: meta.category,
      status: profile?.status ?? 'catalogue',
      calculationType: profile?.calculationType ?? configTiers.calculationType,
      saleUnit: profile?.saleUnit ?? configTiers.saleUnit,
      qtyMin: profile?.qtyMin ?? configTiers.qtyMin,
      prixBase: resolvedPrixBase,
      prixBaseSource:
        excelEntry != null && excelEntry > 0
          ? (`PRIX 2026 · onglet ${excelSheet ?? '—'}` as string)
          : null,
      publicationStatus: resolvePublicationStatus(profile?.status),
    },
    tierMode,
    tiers,
    variants,
    validation,
    simulations,
    counts: {
      total: tiers.length,
      active: tiers.filter((t) => t.active).length,
      archived: tiers.filter((t) => !t.active).length,
    },
  };
}

export async function saveArticleTiers(
  articleId: string,
  body: {
    tierMode?: TierMode;
    tiers: TierInput[];
    qtyMin?: number | null;
    saleUnit?: string;
    variantKey?: string;
    variantLabel?: string | null;
    /** Publie immédiatement vers le POS commercial (profil + formule). */
    publishToPos?: boolean;
  },
  userId?: string,
) {
  await ensureArticleProfile(articleId);
  const mode = body.tierMode ?? inferTierMode(body.tiers);
  const variantKey = body.variantKey ?? '';
  const chained = chainDiscountTierMins(body.tiers);

  const profile = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
  const { resolveArticleVariantListPrice, unitPriceFromRemise } = await import(
    '@/lib/pricing/prix-2026-gf-list-prices'
  );
  const listPrix = resolveArticleVariantListPrice(
    articleId,
    variantKey,
    profile?.family ?? null,
  );

  const normalized = chained.map((t) => {
    const discountPercent = mode === 'percent' ? (t.discountPercent ?? 0) : 0;
    let unitPrice = mode === 'percent' ? null : (t.unitPrice ?? null);
    // Mode % : conserver / recalculer PU catalogue (évite prix faux vs prixBase A0)
    if (mode === 'percent') {
      if (t.unitPrice != null && t.unitPrice > 0) {
        unitPrice = t.unitPrice;
      } else if (listPrix != null && listPrix > 0) {
        unitPrice = unitPriceFromRemise(listPrix, discountPercent);
      }
    }
    return {
      ...t,
      unitPrice,
      discountPercent: mode === 'percent' ? discountPercent : 0,
      variantKey,
      variantLabel: body.variantLabel ?? null,
    };
  });
  const validation = validatePriceTiers(normalized, {
    tierMode: mode,
    qtyMin: body.qtyMin,
    requireTiers: false,
  });
  if (!validation.isValid) {
    throw new Error(validation.errors[0] ?? 'Paliers invalides');
  }

  const zeroPu = normalized.find((t) => t.discountPercent === 0 && t.unitPrice != null)?.unitPrice
    ?? listPrix
    ?? null;

  await prisma.articlePricingProfile.update({
    where: { articleId },
    data: {
      ...(body.qtyMin !== undefined && { qtyMin: body.qtyMin }),
      ...(body.saleUnit && { saleUnit: body.saleUnit }),
      ...(zeroPu != null && zeroPu > 0 ? { prixBase: zeroPu } : {}),
      status: body.publishToPos ? 'published' : 'draft',
    },
  });

  await replaceArticleDiscountTiers(articleId, normalized, { variantKey });

  // Toujours invalider le runtime prix — sync instantanée Admin → POS
  try {
    const { invalidatePricingRuntimeCache } = await import('@/lib/pricing/pricing-runtime-cache');
    invalidatePricingRuntimeCache(`tiers-save:${articleId}`);
  } catch {
    /* best-effort */
  }

  if (body.publishToPos) {
    await publishArticleTiers(articleId, userId);
  }

  try {
    const { notifyAdminModuleMutation } = await import('@/lib/services/admin-data-sync.service');
    await notifyAdminModuleMutation('discount-tiers', {
      userId,
      details: {
        articleId,
        variantKey,
        publishToPos: Boolean(body.publishToPos),
        count: normalized.length,
        listPrix,
        prixBase: zeroPu,
      },
    });
  } catch {
    /* best-effort cache invalidate */
  }

  return getArticleTiers(articleId);
}

export async function publishArticleTiers(articleId: string, userId?: string) {
  await ensureArticleProfile(articleId);
  const payload = await getArticleTiers(articleId);
  if (!payload?.validation.isValid) {
    throw new Error(payload?.validation.errors[0] ?? 'Publication bloquée — paliers invalides');
  }
  let formula = await prisma.formulaVersion.findFirst({
    where: { articleId },
    orderBy: { version: 'desc' },
  });
  if (!formula) {
    formula = await prisma.formulaVersion.create({
      data: {
        articleId,
        version: 1,
        expression: 'base + options',
        variables: {},
        status: 'draft',
        source: 'tiers-auto',
      },
    });
  }
  return publishArticleDynamicPricing(articleId, userId);
}

export async function getGlobalTiers(params: {
  limit?: number;
  search?: string;
}): Promise<TiersGlobalPayload> {
  const list = await listTierArticles({ search: params.search, includeInactive: true });
  const limit = Math.min(params.limit ?? 500, 3000);
  const rows = list.articles.slice(0, limit).map((a) => {
    const config = getConfigTiers(a.articleId);
    const first = config.tiers[0];
    const last = config.tiers[config.tiers.length - 1];
    return {
      articleId: a.articleId,
      articleLabel: a.articleLabel,
      family: a.family,
      category: a.category,
      saleUnit: a.saleUnit,
      calculationType: a.calculationType,
      qtyMin: a.qtyMin,
      tierCount: a.tierCount,
      firstTierMin: first?.minQty ?? null,
      lastTierMax: last?.maxQty ?? null,
      tierMode: config.tierMode,
      publicationStatus: a.publicationStatus,
      anomalyCount: a.anomalyCount,
      updatedAt: a.updatedAt,
    };
  });
  return { rows, total: list.articles.length };
}

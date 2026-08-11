import { prisma } from '@/lib/prisma';
import { CAT_LABELS } from '@/lib/data/catalogue';
import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import { loadDraftDynamicContext, loadPublishedDynamicContext } from '@/lib/pricing/dynamic-pricing-context';
import { scanPricingAnomalies } from '@/lib/pricing/pricing-anomalies';
import { formatTiersSummary, mapFormulaStatus } from './admin-backoffice.mapper';
import { getArticleChips } from './admin-backoffice-chips.service';
import { getConfigTiers } from './admin-backoffice-tiers.catalogue';
import type {
  PricingArticleDetailPayload,
  PricingArticlesListPayload,
  PricingArticleSummary,
  PricingBusinessRuleRow,
  PricingDiffRow,
  PricingVariableMatrixRow,
  PricingVariableRow,
} from './admin-backoffice-pricing.types';

function resolvePublicationStatus(status: string | undefined): PricingArticleSummary['publicationStatus'] {
  if (status === 'published') return 'published';
  if (status === 'draft') return 'draft';
  if (status === 'catalogue') return 'catalogue';
  return 'none';
}

export async function listPricingArticles(params: {
  search?: string;
  category?: string;
  family?: string;
  calculationType?: string;
  formulaStatus?: string;
  includeInactive?: boolean;
  onlyWithAnomalies?: boolean;
  onlyWithoutFormula?: boolean;
} = {}): Promise<PricingArticlesListPayload> {
  let profiles: {
    articleId: string;
    articleLabel: string;
    family: string;
    status: string;
    active: boolean;
    calculationType: string;
    saleUnit: string;
    qtyMin: number | null;
    prixBase: number | null;
    updatedAt: Date;
    discountTiers: { minQty: number; maxQty: number | null; unitPrice: number | null; active: boolean }[];
    formulaVersions: { version: number; status: string }[];
    optionGroups: {
      active: boolean;
      impactsPrice: boolean;
      isInformational: boolean;
      visiblePos: boolean;
      values: { active: boolean }[];
    }[];
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
          prixBase: true,
          updatedAt: true,
          discountTiers: {
            select: { minQty: true, maxQty: true, unitPrice: true, active: true },
            orderBy: { minQty: 'asc' },
          },
          formulaVersions: { select: { version: true, status: true }, orderBy: { version: 'desc' }, take: 2 },
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

  const articles: PricingArticleSummary[] = [];

  for (const cat of POS_CATALOGUE) {
    const profile = profileMap.get(cat.id);
    const configTiers = getConfigTiers(cat.id);
    const dbTiers = profile?.discountTiers ?? [];
    let tierCount = dbTiers.filter((t) => t.active).length;
    let dataSource: PricingArticleSummary['dataSource'] = profile ? 'database' : 'none';
    if (!profile && configTiers.tiers.length > 0) {
      tierCount = configTiers.tiers.length;
      dataSource = 'catalogue';
    } else if (profile && configTiers.tiers.length > tierCount) {
      dataSource = 'hybrid';
    }

    const groups = profile?.optionGroups ?? [];
    const activeGroups = groups.filter((g) => g.active);
    const priceImpactCount = activeGroups.filter((g) => g.impactsPrice && !g.isInformational).length;
    const indicativeCount = activeGroups.filter((g) => g.isInformational || !g.impactsPrice).length;
    const formula = profile ? mapFormulaStatus(profile.formulaVersions) : { status: 'none' as const, version: null };

    articles.push({
      articleId: cat.id,
      articleLabel: profile?.articleLabel ?? cat.name,
      family: profile?.family ?? CAT_LABELS[cat.category] ?? cat.category,
      category: cat.category,
      status: profile?.status ?? 'catalogue',
      active: profile?.active ?? true,
      visiblePos: activeGroups.length === 0 ? (profile?.active ?? true) : activeGroups.some((g) => g.visiblePos),
      calculationType: profile?.calculationType ?? configTiers.calculationType,
      saleUnit: profile?.saleUnit ?? configTiers.saleUnit,
      qtyMin: profile?.qtyMin ?? configTiers.qtyMin,
      prixBase: profile?.prixBase ?? configTiers.prixBase ?? cat.prixDepart ?? null,
      variableCount: activeGroups.length,
      priceImpactCount,
      indicativeCount,
      formulaStatus: formula.status,
      formulaVersion: formula.version,
      tiersCount: tierCount,
      tiersSummary: dbTiers.length
        ? formatTiersSummary(dbTiers)
        : configTiers.tiers.length
          ? `${configTiers.tiers.length} paliers (catalogue)`
          : 'Sans palier',
      anomalyCount: anomalyByArticle.get(cat.id) ?? 0,
      publicationStatus: resolvePublicationStatus(profile?.status),
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
  if (params.family && params.family !== 'all') {
    filtered = filtered.filter((a) => a.family === params.family);
  }
  if (params.calculationType && params.calculationType !== 'all') {
    filtered = filtered.filter((a) => a.calculationType === params.calculationType);
  }
  if (params.formulaStatus && params.formulaStatus !== 'all') {
    filtered = filtered.filter((a) => a.formulaStatus === params.formulaStatus);
  }
  if (!params.includeInactive) {
    filtered = filtered.filter((a) => a.active);
  }
  if (params.onlyWithAnomalies) {
    filtered = filtered.filter((a) => a.anomalyCount > 0);
  }
  if (params.onlyWithoutFormula) {
    filtered = filtered.filter((a) => a.formulaStatus === 'none');
  }

  filtered.sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr'));

  return {
    articles: filtered,
    stats: {
      totalArticles: filtered.length,
      withFormula: filtered.filter((a) => a.formulaStatus !== 'none').length,
      withoutFormula: filtered.filter((a) => a.formulaStatus === 'none').length,
      withAnomalies: filtered.filter((a) => a.anomalyCount > 0).length,
      published: filtered.filter((a) => a.publicationStatus === 'published').length,
      draft: filtered.filter((a) => a.publicationStatus === 'draft').length,
    },
  };
}

function buildDiffRows(
  draft: Awaited<ReturnType<typeof loadDraftDynamicContext>>,
  published: Awaited<ReturnType<typeof loadPublishedDynamicContext>>,
): PricingDiffRow[] {
  const rows: PricingDiffRow[] = [];
  if (!draft && !published) {
    return [{
      element: 'Profil tarifaire',
      draftValue: '—',
      publishedValue: '—',
      differs: true,
      impact: 'critical',
      action: 'Créer profil et publier',
    }];
  }

  const dProfile = draft?.profile;
  const pProfile = published?.profile;
  if (dProfile && pProfile) {
    if (dProfile.prixBase !== pProfile.prixBase) {
      rows.push({
        element: 'Prix base',
        draftValue: String(dProfile.prixBase ?? '—'),
        publishedValue: String(pProfile.prixBase ?? '—'),
        differs: true,
        impact: 'warning',
        action: 'Publier pour synchroniser POS',
      });
    }
    if (dProfile.calculationType !== pProfile.calculationType) {
      rows.push({
        element: 'Type calcul',
        draftValue: dProfile.calculationType,
        publishedValue: pProfile.calculationType,
        differs: true,
        impact: 'critical',
        action: 'Publier profil',
      });
    }
  } else if (dProfile && !pProfile) {
    rows.push({
      element: 'Profil',
      draftValue: 'Brouillon actif',
      publishedValue: 'Non publié',
      differs: true,
      impact: 'critical',
      action: 'Publier article',
    });
  }

  const dFormula = draft?.formula;
  const pFormula = published?.formula;
  if (dFormula && pFormula && dFormula.version !== pFormula.version) {
    rows.push({
      element: 'Formule',
      draftValue: `v${dFormula.version}`,
      publishedValue: `v${pFormula.version}`,
      differs: true,
      impact: 'warning',
      action: 'Publier formule',
    });
  } else if (dFormula && !pFormula) {
    rows.push({
      element: 'Formule',
      draftValue: `v${dFormula.version} brouillon`,
      publishedValue: 'Aucune',
      differs: true,
      impact: 'critical',
      action: 'Publier formule',
    });
  }

  const draftTiers = draft?.discountTiers?.filter((t) => t.active) ?? [];
  const pubTiers = published?.discountTiers?.filter((t) => t.active) ?? [];
  if (draftTiers.length !== pubTiers.length) {
    rows.push({
      element: 'Paliers actifs',
      draftValue: String(draftTiers.length),
      publishedValue: String(pubTiers.length),
      differs: true,
      impact: 'warning',
      action: 'Publier paliers',
    });
  }

  const draftGroups = draft?.optionGroups ?? [];
  const pubGroups = published?.optionGroups ?? [];
  for (const dg of draftGroups) {
    const pg = pubGroups.find((g) => g.fieldKey === dg.fieldKey);
    if (!pg) continue;
    if (dg.impactsPrice !== pg.impactsPrice) {
      rows.push({
        element: `Impact prix — ${dg.label}`,
        draftValue: dg.impactsPrice ? 'ON' : 'OFF',
        publishedValue: pg.impactsPrice ? 'ON' : 'OFF',
        differs: true,
        impact: 'warning',
        action: 'Publier options',
      });
    }
  }

  if (rows.length === 0) {
    rows.push({
      element: 'Synchronisation',
      draftValue: 'Aligné',
      publishedValue: 'Aligné',
      differs: false,
      impact: 'info',
      action: 'Aucune action',
    });
  }

  return rows;
}

export async function getPricingArticleDetail(articleId: string): Promise<PricingArticleDetailPayload | null> {
  const list = await listPricingArticles({ includeInactive: true });
  const article = list.articles.find((a) => a.articleId === articleId);
  if (!article) return null;

  const [chipsPayload, draftCtx, publishedCtx, profileRow] = await Promise.all([
    getArticleChips(articleId, { includeArchived: false }).catch(() => null),
    loadDraftDynamicContext(articleId),
    loadPublishedDynamicContext(articleId),
    prisma.articlePricingProfile.findUnique({
      where: { articleId },
      include: {
        formulaVersions: { orderBy: { version: 'desc' }, take: 1 },
      },
    }),
  ]);

  const variables: PricingVariableRow[] = (chipsPayload?.rows ?? []).map((r) => ({
    id: r.id,
    articleId: r.articleId,
    articleLabel: r.articleLabel,
    blockLabel: r.blockLabel,
    fieldKey: r.fieldKey,
    label: r.label,
    impactsPrice: r.impactsPrice,
    isInformational: r.isInformational,
    impactsStock: r.impactsStock,
    impactsProduction: r.impactsProduction,
    visiblePos: r.visiblePos,
    active: r.active,
    priceModifier: r.priceModifier ?? null,
    source: r.source,
  }));

  const variableMatrix: PricingVariableMatrixRow[] = (chipsPayload?.rows ?? [])
    .filter((r) => r.impactsPrice && !r.isInformational)
    .map((r) => ({
      id: r.id,
      groupId: r.groupId,
      blockLabel: r.blockLabel,
      fieldKey: r.fieldKey,
      groupLabel: r.label,
      optionLabel: r.label,
      priceModifier: r.priceModifier ?? 0,
      impactsPrice: r.impactsPrice,
      isInformational: r.isInformational,
      active: r.active,
      source: r.source,
    }));

  let businessRules: PricingBusinessRuleRow[] = [];
  try {
    const rules = await prisma.businessRule.findMany({
      where: { OR: [{ articleId }, { articleId: null, family: article.family }] },
      orderBy: [{ priority: 'asc' }, { ruleName: 'asc' }],
      take: 80,
    });
    businessRules = rules.map((r) => ({
      id: r.id,
      ruleName: r.ruleName,
      ruleType: r.ruleType,
      message: r.message,
      priority: r.priority,
      active: r.active,
      connected: r.connected,
      impactsPrice: r.ruleType === 'force_price' || r.ruleType === 'validation',
    }));
  } catch {
    businessRules = [];
  }

  const formula = profileRow?.formulaVersions[0];
  const diffPos = buildDiffRows(draftCtx, publishedCtx);
  const isPublished = Boolean(publishedCtx);
  const unpublishedChanges = diffPos.some((d) => d.differs);

  return {
    article,
    summary: {
      calculationType: article.calculationType,
      saleUnit: article.saleUnit,
      qtyMin: article.qtyMin,
      prixBase: article.prixBase,
      prixM2: profileRow?.prixM2 ?? null,
      formulaLabel: formula?.label ?? null,
      formulaVersion: formula?.version ?? article.formulaVersion,
      formulaStatus: article.formulaStatus,
      formulaExpression: formula?.expression ?? draftCtx?.formula?.expression ?? null,
      lastUpdated: article.updatedAt,
      isPublished,
      unpublishedChanges,
    },
    variables,
    variableMatrix,
    businessRules,
    diffPos,
    recommendedSections: ['infos', 'options', 'formule', 'paliers', 'anomalies'],
  };
}

export async function getPricingArticleDiffPos(articleId: string): Promise<PricingDiffRow[]> {
  const [draft, published] = await Promise.all([
    loadDraftDynamicContext(articleId),
    loadPublishedDynamicContext(articleId),
  ]);
  return buildDiffRows(draft, published);
}

export async function getPricingGlobalVariables(params: {
  impact?: 'price' | 'indicative' | 'all';
  limit?: number;
} = {}): Promise<PricingVariableRow[]> {
  const limit = Math.min(2000, params.limit ?? 500);
  const profiles = await prisma.productOptionGroup.findMany({
    take: limit,
    orderBy: [{ articleId: 'asc' }, { sortOrder: 'asc' }],
    include: {
      values: { orderBy: { sortOrder: 'asc' }, take: 1 },
      profile: { select: { articleLabel: true } },
    },
  });

  let rows: PricingVariableRow[] = profiles.map((g) => ({
    id: g.id,
    articleId: g.articleId,
    articleLabel: g.profile?.articleLabel ?? g.articleId,
    blockLabel: g.sectionTitle || 'Général',
    fieldKey: g.fieldKey,
    label: g.label,
    impactsPrice: g.impactsPrice,
    isInformational: g.isInformational,
    impactsStock: g.impactsStock,
    impactsProduction: g.impactsProduction,
    visiblePos: g.visiblePos,
    active: g.active,
    priceModifier: g.values[0]?.priceModifier ?? null,
    source: g.source ?? 'database',
  }));

  if (params.impact === 'price') {
    rows = rows.filter((r) => r.impactsPrice && !r.isInformational);
  } else if (params.impact === 'indicative') {
    rows = rows.filter((r) => r.isInformational || !r.impactsPrice);
  }

  return rows;
}

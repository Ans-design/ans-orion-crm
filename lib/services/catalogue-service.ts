/**
 * Catalogue unifié — métadonnées statiques + prix/labels DB (source de vérité prod).
 */
import { CATALOGUE, CATEGORIES, CAT_LABELS, type CatalogueItem, type Category } from '@/lib/data/catalogue';
import { POS_HIDDEN_ARTICLE_IDS } from '@/lib/data/catalogue-meta';
import { resolveCatalogCanonicalId } from '@/lib/pos/catalog-resolver';
import { prisma } from '@/lib/prisma';
import { getPublishedConfig } from '@/lib/services/admin-config';
import type { ArticleAdminEntry } from '@/lib/admin-config/types';
import { computeCatalogueDbCoverage, type CatalogueCoverage } from '@/lib/services/catalogue-coverage';
import {
  buildDatabasePrimaryPosItems,
  buildHybridPosItems,
  buildSinglePosItem,
  resolvePosCatalogueSource,
  type PosCatalogueItem,
  type PosCataloguePayloadSource,
  type ProfileSnapshot,
} from '@/lib/services/catalogue-pos-builder';
import { mapProfileRowToSellable } from '@/lib/pos/load-sellable-profiles';
import {
  enrichPosItemWithDirectSale,
  loadDirectSalePosMetaMap,
} from '@/lib/direct-sale/pos-enrichment';
import {
  familyToCategoryId as mapFamilyToCategoryId,
  suggestCorrectCategory,
} from '@/lib/pos/article-category-taxonomy';
import { isLocalAppEnv } from '@/lib/local-dev';

export type { PosCatalogueItem, PosCataloguePayloadSource };

export type PosCataloguePayload = {
  items: PosCatalogueItem[];
  categories: Category[];
  catLabels: Record<string, string>;
  source: PosCataloguePayloadSource;
  coverage: CatalogueCoverage;
  updatedAt: string;
};

type ProfileRow = ProfileSnapshot;

function isVisibleInPos(state: ArticleAdminEntry | undefined, role: string): boolean {
  if (!state) return true;
  if (state.visibility === 'HIDDEN') return false;
  if (state.visibility === 'ADMIN_ONLY' && role !== 'admin' && role !== 'manager') return false;
  return true;
}

function familyToCategoryId(family: string | null, hint?: { articleId?: string; name?: string }): string {
  return mapFamilyToCategoryId(family, {
    articleId: hint?.articleId,
    name: hint?.name,
    family,
  });
}

function inferConfigType(articleId: string, label?: string): string {
  const exact = CATALOGUE.find((a) => a.id === articleId);
  if (exact) return exact.configType;
  const dash = articleId.indexOf('-');
  if (dash > 0) {
    const prefix = `${articleId.slice(0, dash)}-`;
    const sibling = CATALOGUE.find((a) => a.id.startsWith(prefix));
    if (sibling) return sibling.configType;
  }
  const suggested = suggestCorrectCategory({ articleId, name: label });
  if (suggested === 'finitions') return 'finition';
  if (suggested === 'textile') return 'textile';
  if (suggested === 'carterie') return 'carte_visite';
  if (suggested === 'flyers') return 'flyer';
  if (suggested === 'grand_format') return 'grand_format';
  return 'standard';
}

const builderCtx = {
  familyToCategoryId,
  inferConfigType,
  isVisibleInPos,
};

let maintenanceOnce = false;

/**
 * Merges / réparations catalogue — à appeler explicitement (Centre sync, sync-pos).
 * Ne doit PAS être déclenché par une simple lecture POS.
 */
export async function runPosCatalogueMaintenance(opts?: {
  force?: boolean;
}): Promise<{ ran: boolean }> {
  if (maintenanceOnce && !opts?.force) return { ran: false };
  try {
    const { mergePhotoPrintArticles } = await import(
      '@/lib/services/merge-photo-print-articles.service'
    );
    await mergePhotoPrintArticles();
  } catch {
    /* ignore */
  }
  try {
    const { mergeGrandFormatArticles } = await import(
      '@/lib/services/merge-grand-format-articles.service'
    );
    await mergeGrandFormatArticles();
  } catch {
    /* ignore */
  }
  try {
    const { repairMisclassifiedPosCategories } = await import(
      '@/lib/services/pos-category-repair.service'
    );
    await repairMisclassifiedPosCategories();
  } catch {
    /* ignore */
  }
  try {
    const { ensurePlvDirectSalePricesSynced } = await import(
      '@/lib/services/plv-direct-sale-price-sync.service'
    );
    await ensurePlvDirectSalePricesSynced();
  } catch {
    /* ignore */
  }
  try {
    const { mergeRedundantDirectSalePosCards } = await import(
      '@/lib/services/merge-direct-sale-pos.service'
    );
    await mergeRedundantDirectSalePosCards();
  } catch {
    /* ignore */
  }
  try {
    const { mergePersonalizedDuplicateArticles } = await import(
      '@/lib/services/merge-personalized-articles.service'
    );
    await mergePersonalizedDuplicateArticles();
  } catch {
    /* ignore */
  }
  try {
    const { mergeVariantPosCards } = await import(
      '@/lib/services/merge-variant-pos-cards.service'
    );
    await mergeVariantPosCards();
  } catch {
    /* ignore */
  }
  maintenanceOnce = true;
  return { ran: true };
}

/** Lecture seule — aucun merge/écriture catalogue. */
export async function getPosCatalogue(role = 'commercial'): Promise<PosCataloguePayload> {
  let publishedArticles: Record<string, ArticleAdminEntry> = {};
  let publishedFailed = false;
  try {
    const pub = await getPublishedConfig();
    publishedArticles = pub.articles ?? {};
  } catch {
    // PRIX-002 : ne pas inventer de config publiée
    publishedFailed = true;
  }

  let profiles: ProfileRow[] = [];
  let profilesFailed = false;
  try {
    profiles = await prisma.articlePricingProfile.findMany({
      where: { active: true },
      select: {
        articleId: true,
        articleLabel: true,
        family: true,
        prixBase: true,
        prixM2: true,
        prixCm2: true,
        calculationType: true,
        status: true,
        active: true,
        saleUnit: true,
        discountTiers: { where: { active: true }, select: { id: true }, take: 1 },
        materialPrices: { where: { active: true }, select: { id: true }, take: 1 },
        formulaVersions: { where: { status: 'published' }, select: { id: true }, take: 1 },
      },
    }).then((rows) =>
      rows.map((row) => {
        const sellable = mapProfileRowToSellable(row);
        return {
          articleId: row.articleId,
          articleLabel: row.articleLabel,
          family: row.family,
          prixBase: row.prixBase,
          prixM2: row.prixM2,
          prixCm2: row.prixCm2,
          calculationType: row.calculationType,
          hasPublishedFormula: sellable.hasPublishedFormula,
          hasDiscountTiers: sellable.hasDiscountTiers,
          hasMaterialPrices: sellable.hasMaterialPrices,
          status: row.status,
          active: row.active,
          saleUnit: row.saleUnit,
        } satisfies ProfileRow;
      }),
    );
  } catch {
    profilesFailed = true;
  }

  const staticIds = CATALOGUE.map((a) => a.id);
  const coverage = computeCatalogueDbCoverage(staticIds, profiles.map((p) => p.articleId), POS_HIDDEN_ARTICLE_IDS);

  // PRIX-002 : erreur DB ⇒ catalogue sans prix inventés (items visibles, prix null)
  if (publishedFailed && profilesFailed) {
    const itemsBase = buildHybridPosItems([], {}, role, builderCtx).map((item) => ({
      ...item,
      prixDepart: null,
      priceConfigured: false,
      priceMissingReason: 'PRICE_UNAVAILABLE',
      priceSource: 'catalogue-fallback' as const,
    }));
    return {
      items: itemsBase,
      categories: CATEGORIES,
      catLabels: CAT_LABELS,
      source: 'catalogue-fallback',
      coverage,
      updatedAt: new Date().toISOString(),
    };
  }

  /** Prod/staging : SoT DB — pas de hybrid structurel dès qu’il y a des profils. Local garde hybrid pour démo. */
  const forceDbPrimary =
    !isLocalAppEnv() &&
    profiles.length > 0 &&
    coverage.mode !== 'database-full' &&
    coverage.mode !== 'database-primary';

  const itemsRaw =
    coverage.mode === 'database-primary' || coverage.mode === 'database-full' || forceDbPrimary
      ? buildDatabasePrimaryPosItems(profiles, publishedArticles, role, builderCtx)
      : buildHybridPosItems(profiles, publishedArticles, role, builderCtx);

  // Garde-fou : jamais catalogue vide (chunks 404 / profils ART archivés → fallback hybride en local seulement)
  const usedLocalHybridFallback = itemsRaw.length === 0 && isLocalAppEnv();
  const itemsBase = usedLocalHybridFallback
    ? buildHybridPosItems(profiles, publishedArticles, role, builderCtx)
    : itemsRaw;

  const directSaleMeta = await loadDirectSalePosMetaMap();
  const items = itemsBase.map((item) => enrichPosItemWithDirectSale(item, directSaleMeta));

  const sourceMode = usedLocalHybridFallback
    ? 'hybrid'
    : forceDbPrimary
      ? 'database-primary'
      : coverage.mode;

  return {
    items,
    categories: CATEGORIES,
    catLabels: CAT_LABELS,
    source: resolvePosCatalogueSource(sourceMode),
    coverage,
    updatedAt: new Date().toISOString(),
  };
}

export async function resolveCatalogueItemFromDb(articleId: string): Promise<CatalogueItem | null> {
  const canonicalId = resolveCatalogCanonicalId(articleId);
  const base = CATALOGUE.find((a) => a.id === canonicalId);

  try {
    const profile = await prisma.articlePricingProfile.findUnique({
      where: { articleId: canonicalId },
      select: {
        articleId: true,
        articleLabel: true,
        family: true,
        prixBase: true,
        prixM2: true,
        prixCm2: true,
        calculationType: true,
        status: true,
        active: true,
        saleUnit: true,
        discountTiers: { where: { active: true }, select: { id: true }, take: 1 },
        materialPrices: { where: { active: true }, select: { id: true }, take: 1 },
        formulaVersions: { where: { status: 'published' }, select: { id: true }, take: 1 },
      },
    });

    const snapshot: ProfileRow = profile
      ? (() => {
          const sellable = mapProfileRowToSellable(profile);
          return {
            articleId: profile.articleId,
            articleLabel: profile.articleLabel,
            family: profile.family,
            prixBase: profile.prixBase,
            prixM2: profile.prixM2,
            prixCm2: profile.prixCm2,
            calculationType: profile.calculationType,
            hasPublishedFormula: sellable.hasPublishedFormula,
            hasDiscountTiers: sellable.hasDiscountTiers,
            hasMaterialPrices: sellable.hasMaterialPrices,
            status: profile.status,
            active: profile.active,
            saleUnit: profile.saleUnit,
          };
        })()
      : {
          articleId: canonicalId,
          articleLabel: base?.name ?? canonicalId,
          family: base?.category ?? null,
          prixBase: null,
          status: 'draft',
          active: true,
          saleUnit: base?.unit ?? 'pièce',
        };

    if (base) {
      const item = buildSinglePosItem(snapshot, builderCtx, base);
      const metaMap = await loadDirectSalePosMetaMap();
      return enrichPosItemWithDirectSale(item, metaMap);
    }

    if (profile) {
      const item = buildSinglePosItem(profile, builderCtx);
      const metaMap = await loadDirectSalePosMetaMap();
      return enrichPosItemWithDirectSale(item, metaMap);
    }
  } catch {
    // PRIX-002 : DB error ⇒ null (pas de prix inventé depuis le catalogue statique)
    return null;
  }

  return base ?? null;
}

export { findCatalogueItem } from '@/lib/data/catalogue-meta';
export { computeCatalogueDbCoverage } from '@/lib/services/catalogue-coverage';
export {
  buildDatabasePrimaryPosItems,
  buildHybridPosItems,
  buildSinglePosItem,
  resolvePosCatalogueSource,
} from '@/lib/services/catalogue-pos-builder';

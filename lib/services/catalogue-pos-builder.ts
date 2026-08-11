import { CATALOGUE, type CatalogueItem } from '@/lib/data/catalogue';
import {
  POS_HIDDEN_ARTICLE_IDS,
  isPosHiddenTirageVariant,
  isPosHiddenGrandFormatVariant,
  isPosHiddenFinitionVariant,
} from '@/lib/data/catalogue-meta';
import { isPosParentArticleId } from '@/lib/pos/article-2026-canonical-map';
import { isRedundantGrandFormatPosCard, isPvcPetitFormatArticle, isPlvFinishedProduct } from '@/lib/pos/grand-format-redundant';
import { isRedundantDirectSalePosSku } from '@/lib/pos/direct-sale-pos-redundant';
import { isRedundantPersonalizedArticle } from '@/lib/pos/personalized-article-redundant';
import { isRedundantFinitionVariantCard } from '@/lib/pos/finition-variant-redundant';
import type { ArticleAdminEntry } from '@/lib/admin-config/types';
import type { CatalogueCoverageMode } from '@/lib/services/catalogue-coverage';
import { resolvePosPriceConfigured, resolvePosPriceMode, type PosSellableProfile } from '@/lib/pos/pos-price-policy';
import type { PosPriceMode } from '@/lib/pos/pos-price-policy';
import { resolveCanonicalEntryPrice } from '@/lib/pricing/canonical-price-resolver';
import { entryGrandFormatPrix2026 } from '@/lib/data/prix-2026-grids/grand-format';

function resolveEntryUnitPrice(articleId: string): number | null {
  return resolveCanonicalEntryPrice(articleId).unitPrice;
}

export type PosCatalogueItem = CatalogueItem & {
  priceSource: 'database' | 'catalogue' | 'hybrid' | 'catalogue-fallback';
  visiblePos: boolean;
  profileStatus?: string;
  priceConfigured: boolean;
  priceMissingReason?: string | null;
  priceMode?: PosPriceMode;
  adminFixHref?: string;
  /** Métadonnées article vente directe (prix unitaire standard) */
  directSale?: {
    pricingMode: 'direct' | 'excel_grid';
    unitPrice: number;
    unit: string;
    isCustomizable: boolean;
    requiresQuoteIfCustom: boolean;
    allowManualPrice: boolean;
    minQuantity: number;
    maxQuantity: number | null;
    addonCount: number;
    excelSheet?: string | null;
  };
};

export type PosCataloguePayloadSource = 'database' | 'catalogue-fallback' | 'database-primary' | 'database-full';

export type ProfileSnapshot = {
  articleId: string;
  articleLabel: string;
  family: string | null;
  prixBase: number | null;
  prixM2?: number | null;
  prixCm2?: number | null;
  calculationType?: string | null;
  hasPublishedFormula?: boolean;
  hasDiscountTiers?: boolean;
  hasMaterialPrices?: boolean;
  status: string;
  active: boolean;
  saleUnit: string;
};

type BuilderCtx = {
  familyToCategoryId: (
    family: string | null,
    hint?: { articleId?: string; name?: string },
  ) => string;
  inferConfigType: (articleId: string, label?: string) => string;
  isVisibleInPos: (state: ArticleAdminEntry | undefined, role: string) => boolean;
};

function profileToSellable(profile: ProfileSnapshot): PosSellableProfile {
  return {
    articleId: profile.articleId,
    status: profile.status,
    prixBase: profile.prixBase,
    active: profile.active,
    prixM2: profile.prixM2 ?? null,
    prixCm2: profile.prixCm2 ?? null,
    calculationType: profile.calculationType ?? null,
    hasPublishedFormula: profile.hasPublishedFormula ?? false,
    hasDiscountTiers: profile.hasDiscountTiers ?? false,
    hasMaterialPrices: profile.hasMaterialPrices ?? false,
  };
}

/** Catalogue GF : toujours m² — vérité runtime = DB (prixM2 / prixDepart profil), pas Excel. */
function applyGrandFormatPosDisplay(
  item: PosCatalogueItem,
  profile?: ProfileSnapshot,
): PosCatalogueItem {
  const isGf =
    item.category === 'grand_format'
    || item.id.startsWith('gf-')
    || Boolean(entryGrandFormatPrix2026(item.id));
  if (!isGf) return item;

  const fromM2 =
    profile?.prixM2 != null && profile.prixM2 > 0
      ? profile.prixM2
      : null;
  const fromDb =
    profile?.prixBase != null && profile.prixBase > 0
      ? profile.prixBase
      : null;
  // PRIX-002 : Excel = import uniquement — pas de prix inventé / seed TS pour carte POS.
  // Jamais item.prixDepart (catalogue statique) : sinon contradiction Admin / Commercial.
  const displayPrix = fromM2 ?? fromDb;
  return {
    ...item,
    category: 'grand_format',
    unit: 'm²',
    prixDepart: displayPrix,
    priceConfigured: displayPrix != null && displayPrix > 0 ? true : item.priceConfigured,
    priceMissingReason:
      displayPrix != null && displayPrix > 0
        ? null
        : (item.priceMissingReason ?? 'Tarif GF non publié'),
    priceMode:
      displayPrix != null && displayPrix > 0 && item.priceMode === 'to_configure'
        ? 'calculated'
        : item.priceMode,
    priceSource: item.priceSource,
  };
}

function profileToItem(
  profile: ProfileSnapshot,
  ctx: BuilderCtx,
  base?: CatalogueItem,
): PosCatalogueItem {
  const sellable = profileToSellable(profile);
  const priceState = resolvePosPriceConfigured(sellable);
  const priceMode = resolvePosPriceMode(sellable);
  // PRIX-002 : DB publiée = vérité runtime ; moteurs dédiés en secours ; jamais Excel.
  let dbPrixBase =
    profile.prixBase != null && profile.prixBase > 0
      ? profile.prixBase
      : null;
  if (dbPrixBase == null) {
    const entry = resolveEntryUnitPrice(profile.articleId);
    if (entry != null && entry > 0) dbPrixBase = entry;
  }
  const hint = { articleId: profile.articleId, name: profile.articleLabel };
  const resolvedCategory = profile.family?.trim()
    ? ctx.familyToCategoryId(profile.family, hint)
    : base?.category ?? ctx.familyToCategoryId(null, hint);

  // Affichage « À partir de » : DB / moteurs seulement — jamais constante catalogue TS.
  const displayPrix =
    dbPrixBase
    ?? (priceState.configured ? resolveEntryUnitPrice(profile.articleId) : null);

  let item: PosCatalogueItem;
  if (base) {
    item = {
      ...base,
      name: profile.articleLabel?.trim() ? profile.articleLabel : base.name,
      category: resolvedCategory,
      prixDepart: displayPrix,
      priceSource: dbPrixBase != null ? 'database' : priceState.configured ? 'hybrid' : 'catalogue',
      visiblePos: profile.active,
      profileStatus: profile.status,
      priceConfigured: priceState.configured || displayPrix != null,
      priceMissingReason:
        priceState.configured || displayPrix != null
          ? null
          : (priceState.reason ?? 'Tarif non publié / non configuré'),
      priceMode: displayPrix != null && priceMode === 'to_configure' ? 'calculated' : priceMode,
      adminFixHref: priceState.adminHref,
    };
  } else {
    item = {
      id: profile.articleId,
      name: profile.articleLabel,
      category: resolvedCategory,
      description: '',
      prixDepart: displayPrix,
      unit: profile.saleUnit || 'pièce',
      icon: '📦',
      configType: ctx.inferConfigType(profile.articleId, profile.articleLabel),
      priceSource: dbPrixBase != null ? 'database' : 'catalogue',
      visiblePos: profile.active,
      profileStatus: profile.status,
      priceConfigured: priceState.configured || displayPrix != null,
      priceMissingReason:
        priceState.configured || displayPrix != null
          ? null
          : (priceState.reason ?? 'Tarif non publié / non configuré'),
      priceMode: displayPrix != null && priceMode === 'to_configure' ? 'calculated' : priceMode,
      adminFixHref: priceState.adminHref,
    };
  }
  return applyGrandFormatPosDisplay(item, profile);
}

/** Cartes à ne jamais exposer au POS (doublons / formats / SKUs fusionnés). */
function isNeverPosCard(articleId: string, label: string | null | undefined): boolean {
  if (/^ART-/i.test(articleId)) return true;
  if (/^\[prix→/i.test(String(label ?? '')) || /^\[archiv/i.test(String(label ?? ''))) return true;
  // Hors parents gelés (~95) : pas de carte orpheline DB
  if (!isPosParentArticleId(articleId) && !/^gf-|^tx-|^gd-|^plv-|^cv-|^fly-|^cal-|^bn-|^ph-|^pkg-|^evt-|^fin-|^doc-|^imp-|^cg-|^bk-/i.test(articleId)) {
    // AVD / GF numeriques / ART déjà couverts — archiver hors catalogue
    if (/^(AVD|GF|DS-)\d+/i.test(articleId)) return true;
  }
  if (isPosHiddenGrandFormatVariant(articleId, label)) return true;
  if (isPosHiddenFinitionVariant(articleId, label)) return true;
  if (isRedundantGrandFormatPosCard(label, articleId)) return true;
  if (isRedundantFinitionVariantCard(label, articleId)) return true;
  if (isRedundantDirectSalePosSku(label, articleId)) return true;
  if (isRedundantPersonalizedArticle(label, articleId)) return true;
  if (isPvcPetitFormatArticle(label, articleId)) return true;
  return false;
}

/** Pollution si on force la catégorie Grand Format. */
function isPollutionInGrandFormat(articleId: string, label: string | null | undefined): boolean {
  if (isNeverPosCard(articleId, label)) return true;
  if (isPvcPetitFormatArticle(label, articleId)) return true;
  if (isPlvFinishedProduct(label, articleId) && !/^gf-/i.test(articleId)) return true;
  return false;
}

/** Mode database-primary : profils publiés parents + catalogue statique en secours. */
export function buildDatabasePrimaryPosItems(
  profiles: ProfileSnapshot[],
  publishedArticles: Record<string, ArticleAdminEntry>,
  role: string,
  ctx: BuilderCtx,
): PosCatalogueItem[] {
  const staticById = new Map(CATALOGUE.map((a) => [a.id, a]));
  const parentProfiles = profiles
    .filter((p) => p.active && p.status === 'published')
    .filter((p) => isPosParentArticleId(p.articleId) || staticById.has(p.articleId))
    .filter((p) => !POS_HIDDEN_ARTICLE_IDS.has(p.articleId))
    .filter((p) => !isPosHiddenTirageVariant(p.articleId, p.articleLabel))
    .filter((p) => !isNeverPosCard(p.articleId, p.articleLabel))
    .filter((p) => ctx.isVisibleInPos(publishedArticles[p.articleId], role));

  const fromDb = parentProfiles.map((p) => profileToItem(p, ctx, staticById.get(p.articleId)));

  if (fromDb.length >= staticById.size - POS_HIDDEN_ARTICLE_IDS.size) {
    return fromDb.filter((item) => {
      if (item.category !== 'grand_format') return true;
      return !isPollutionInGrandFormat(item.id, item.name);
    });
  }

  // Couverture DB incomplète → hybride (catalogue statique 95 + enrichissement DB)
  return buildHybridPosItems(profiles, publishedArticles, role, ctx);
}

/** Mode hybride : catalogue statique enrichi DB + orphelins publiés. */
export function buildHybridPosItems(
  profiles: ProfileSnapshot[],
  publishedArticles: Record<string, ArticleAdminEntry>,
  role: string,
  ctx: BuilderCtx,
): PosCatalogueItem[] {
  const profileMap = new Map(profiles.map((p) => [p.articleId, p]));
  const staticIdSet = new Set(
    CATALOGUE.filter((a) => !POS_HIDDEN_ARTICLE_IDS.has(a.id)).map((a) => a.id),
  );

  const items = CATALOGUE.filter((a) => !POS_HIDDEN_ARTICLE_IDS.has(a.id))
    .filter((a) => ctx.isVisibleInPos(publishedArticles[a.id], role))
    .map((base) => {
      const profile = profileMap.get(base.id);
      if (!profile) {
        // Hors profil DB : moteurs dédiés uniquement — jamais catalogue.ts ni Excel (PRIX-002).
        const entry = resolveEntryUnitPrice(base.id);
        const displayPrix = entry != null && entry > 0 ? entry : null;
        const sellable = {
          articleId: base.id,
          status: 'draft' as const,
          prixBase: displayPrix,
          active: true,
        };
        const priceState = resolvePosPriceConfigured(sellable);
        const priceMode = resolvePosPriceMode(sellable);
        return {
          ...base,
          priceSource: displayPrix != null ? ('hybrid' as const) : ('catalogue' as const),
          visiblePos: true,
          prixDepart: displayPrix,
          priceConfigured: displayPrix != null,
          priceMissingReason:
            displayPrix != null ? null : (priceState.reason ?? 'Tarif non publié / non configuré'),
          priceMode: displayPrix != null && priceMode === 'to_configure' ? 'calculated' : priceMode,
          adminFixHref: priceState.adminHref,
        };
      }
      return profileToItem(profile, ctx, base);
    })
    .map((item) => applyGrandFormatPosDisplay(item, profileMap.get(item.id)));

  for (const profile of profiles) {
    if (staticIdSet.has(profile.articleId)) continue;
    if (profile.status !== 'published') continue;
    // Pas d’orphelins hors des 95 parents (ART / AVD / variantes)
    if (!isPosParentArticleId(profile.articleId)) continue;
    if (isPosHiddenTirageVariant(profile.articleId, profile.articleLabel)) continue;
    if (isNeverPosCard(profile.articleId, profile.articleLabel)) continue;
    if (!ctx.isVisibleInPos(publishedArticles[profile.articleId], role)) continue;
    items.push(profileToItem(profile, ctx));
  }

  return items.filter((item) => {
    if (item.category !== 'grand_format') return true;
    return !isPollutionInGrandFormat(item.id, item.name);
  });
}

export function buildSinglePosItem(
  profile: ProfileSnapshot,
  ctx: BuilderCtx,
  base?: CatalogueItem,
): PosCatalogueItem {
  return profileToItem(profile, ctx, base);
}

export function resolvePosCatalogueSource(mode: CatalogueCoverageMode): PosCataloguePayloadSource {
  // PRIX-002 : « catalogue-fallback » = signal d’absence DB, pas une vérité tarifaire runtime.
  if (mode === 'static-fallback') return 'catalogue-fallback';
  if (mode === 'database-full') return 'database-full';
  if (mode === 'database-primary') return 'database-primary';
  return 'database';
}

/** Indique que le catalogue ne doit pas inventer de prix (DB absente). */
export function isCataloguePriceUnavailableMode(mode: CatalogueCoverageMode): boolean {
  return mode === 'static-fallback';
}

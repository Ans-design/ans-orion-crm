import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import { isGrandFormatArticleId } from '@/lib/grand-format/article-meta';
import { isBlocNoteArticleId } from '@/lib/pricing/bloc-note-pricing';
import { isCarnetAutocopiantArticleId } from '@/lib/pricing/carnet-autocopiant-pricing';
import { isStampArticleId } from '@/lib/pricing/stamp-pricing';
import { isPhotobookArticleId } from '@/lib/pricing/photobook-pricing';
import { isTiragePhotoArticleId } from '@/lib/pricing/tirage-photo-pricing';
import { isCadrePhotoArticleId } from '@/lib/pricing/cadre-photo-pricing';
import { isImpressionSfPricingArticle } from '@/lib/pricing/impression-sf-pricing';
import { isLivresPricingArticle } from '@/lib/pricing/livres-pricing';
import { isPlvPricingArticle } from '@/lib/pricing/plv-pricing';
import { isEventPricingArticleId } from '@/lib/pricing/event-pricing';
import { isTextileArticleId } from '@/lib/pricing/textile-ids';
import { isFlyerPricingArticle } from '@/lib/pricing/flyer-pricing';
import { isCarteriePricingArticle } from '@/lib/pricing/carterie-pricing';
import { isCalendarPricingArticle } from '@/lib/pricing/calendar-pricing';
import { isStandaloneFinitionArticle } from '@/lib/finition/finition-pricing';
import { isPackagingBoxPricingArticle } from '@/lib/packaging/packaging-box-price';
import { isDoypackPricingArticle } from '@/lib/packaging/doypack-price';
import { isPrecutLabelPricingArticle } from '@/lib/packaging/precut-label-price';
import { isCustomCupPricingArticle } from '@/lib/packaging/custom-cup-price';
import { isHangtagPricingArticle } from '@/lib/packaging/hangtag-price';
import { isPaperBagPricingArticle } from '@/lib/packaging/paper-bag-price';
import { articleHasPrix2026Grid } from '@/lib/data/prix-2026-grids';
import { isPrix2026LegacyEnabled } from '@/lib/pricing/prix-2026-legacy';

export type PosPriceProfile = {
  articleId: string;
  status: string;
  prixBase: number | null;
  active: boolean;
};

/** Profil enrichi pour décider si un article est vendable au POS / panier. */
export type PosSellableProfile = PosPriceProfile & {
  prixM2?: number | null;
  prixCm2?: number | null;
  calculationType?: string | null;
  hasPublishedFormula?: boolean;
  hasDiscountTiers?: boolean;
  hasMaterialPrices?: boolean;
};

function hasDirectUnitPrice(profile: PosSellableProfile): boolean {
  return (profile.prixBase ?? 0) > 0
    || (profile.prixM2 ?? 0) > 0
    || (profile.prixCm2 ?? 0) > 0;
}

export function isStrictPosPricing(): boolean {
  if (process.env.STRICT_POS_PRICING === '0' || process.env.STRICT_POS_PRICING === 'false') {
    // Désactivation explicite uniquement hors production réelle
    if (
      process.env.NODE_ENV === 'production'
      || process.env.VERCEL_ENV === 'production'
      || process.env.HOSTINGER === 'true'
      || process.env.USE_PRODUCTION_DB === 'true'
    ) {
      return true;
    }
    const env = (process.env.APP_ENV || '').toLowerCase();
    if (env === 'production' || env === 'prod') return true;
    return false;
  }
  if (process.env.STRICT_POS_PRICING === '1' || process.env.STRICT_POS_PRICING === 'true') return true;
  if (
    process.env.NODE_ENV === 'production'
    || process.env.VERCEL_ENV === 'production'
    || process.env.HOSTINGER === 'true'
    || process.env.USE_PRODUCTION_DB === 'true'
  ) {
    return true;
  }
  const env = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
  return env === 'ci' || env === 'production' || env === 'prod';
}

/**
 * Articles avec moteur tarifaire dédié (formules / grilles ISF / GF surface / carnet…).
 * Ne dépend pas d’un hit catalogue statique — les SKU DB-only restent couverts.
 * Note : une grille Excel « entrée » GF ne remplace pas le moteur live surface/laize/bâche.
 */
export function articleHasDedicatedPricingEngine(
  articleId: string,
  category?: string | null,
): boolean {
  const art = findCatalogueItem(articleId);
  const cat = category ?? art?.category;
  return (
    (isPrix2026LegacyEnabled() && articleHasPrix2026Grid(articleId))
    || isBlocNoteArticleId(articleId)
    || isCarnetAutocopiantArticleId(articleId)
    || isStampArticleId(articleId)
    || isPhotobookArticleId(articleId)
    || isTiragePhotoArticleId(articleId)
    || isCadrePhotoArticleId(articleId)
    || isImpressionSfPricingArticle(articleId, cat)
    || isPlvPricingArticle(articleId)
    || isLivresPricingArticle(articleId)
    || isGrandFormatArticleId(articleId)
    || isEventPricingArticleId(articleId)
    || isTextileArticleId(articleId)
    || isFlyerPricingArticle(articleId, cat)
    || isCarteriePricingArticle(articleId, cat)
    || isCalendarPricingArticle(articleId)
    || isStandaloneFinitionArticle(articleId)
    || isPackagingBoxPricingArticle(articleId)
    || isDoypackPricingArticle(articleId)
    || isPrecutLabelPricingArticle(articleId)
    || isCustomCupPricingArticle(articleId)
    || isHangtagPricingArticle(articleId)
    || isPaperBagPricingArticle(articleId)
  );
}

export function isArticleSellable(profile: PosSellableProfile | undefined | null): boolean {
  if (!profile || profile.active === false) return false;

  if (articleHasDedicatedPricingEngine(profile.articleId)) {
    // GF / moteurs dédiés : publiés + signal prix (base, m², matières, formules, paliers)
    if (isGrandFormatArticleId(profile.articleId)) {
      if (profile.status !== 'published') return false;
      return hasDirectUnitPrice(profile)
        || !!profile.hasMaterialPrices
        || !!profile.hasDiscountTiers
        || !!profile.hasPublishedFormula;
    }
    // ISF / carnet / bloc-note / PLV : moteur code = toujours calculable
    return true;
  }

  if (profile.status !== 'published') return false;

  if (profile.calculationType === 'formula') {
    return !!profile.hasPublishedFormula;
  }

  return hasDirectUnitPrice(profile)
    || !!profile.hasDiscountTiers
    || !!profile.hasMaterialPrices
    || !!profile.hasPublishedFormula;
}

export function resolvePosPriceMissingReason(profile: PosSellableProfile | undefined | null): string {
  if (!profile) return 'Profil tarifaire absent';
  if (profile.active === false) return 'Article inactif';

  if (articleHasDedicatedPricingEngine(profile.articleId)) {
    if (isGrandFormatArticleId(profile.articleId) && profile.status !== 'published') {
      return 'Profil grand format non publié';
    }
    if (isGrandFormatArticleId(profile.articleId) && !hasDirectUnitPrice(profile) && !profile.hasMaterialPrices) {
      return 'Prix m² / matières grand format à configurer';
    }
    if (isTextileArticleId(profile.articleId)) {
      return 'Prix textile Admin (support / marquage / main d’œuvre)';
    }
    return 'Prix base à configurer';
  }

  if (profile.status !== 'published') return 'Profil tarifaire non publié';
  if (profile.calculationType === 'formula' && !profile.hasPublishedFormula) {
    return 'Formule tarifaire non publiée';
  }
  if (!hasDirectUnitPrice(profile) && !profile.hasDiscountTiers && !profile.hasMaterialPrices) {
    return 'Prix base à configurer';
  }
  return 'Prix à configurer';
}

export function resolvePosPriceConfigured(profile: PosSellableProfile | undefined | null): {
  configured: boolean;
  reason: string | null;
  adminHref: string;
} {
  const articleId = profile?.articleId ?? '';
  const adminHref = isTextileArticleId(articleId)
    ? '/administration/textile'
    : articleId.startsWith('fin-')
      ? '/administration/finitions-reliures'
      : `/administration/catalogue-pos?article=${encodeURIComponent(articleId)}`;

  if (isArticleSellable(profile)) {
    return { configured: true, reason: null, adminHref };
  }

  return {
    configured: false,
    reason: resolvePosPriceMissingReason(profile),
    adminHref,
  };
}

/** Mode tarifaire affiché au POS (carte + configurateur). */
export type PosPriceMode = 'direct' | 'calculated' | 'to_configure' | 'quote_required';

export function resolvePosPriceMode(
  profile: PosSellableProfile | undefined | null,
  opts?: { directSaleUnitPrice?: number | null; requiresQuoteIfCustom?: boolean },
): PosPriceMode {
  if (opts?.directSaleUnitPrice != null && opts.directSaleUnitPrice > 0) {
    return 'direct';
  }
  if (opts?.requiresQuoteIfCustom) {
    return 'quote_required';
  }
  if (profile && articleHasDedicatedPricingEngine(profile.articleId)) {
    if (isGrandFormatArticleId(profile.articleId) && !isArticleSellable(profile)) {
      return 'to_configure';
    }
    return 'calculated';
  }
  if (isArticleSellable(profile)) {
    if (profile?.calculationType === 'formula' || profile?.hasPublishedFormula || profile?.hasDiscountTiers) {
      return 'calculated';
    }
    if (hasDirectUnitPrice(profile!)) return 'direct';
    return 'calculated';
  }
  return 'to_configure';
}

export function posPriceModeLabel(mode: PosPriceMode): string {
  switch (mode) {
    case 'direct':
      return 'Prix direct';
    case 'calculated':
      return 'Prix calculé';
    case 'quote_required':
      return 'Sur devis';
    case 'to_configure':
    default:
      return 'Prix à configurer';
  }
}

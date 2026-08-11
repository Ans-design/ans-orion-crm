import { useMemo } from 'react';
import type { CatalogueItem } from '@/lib/data/catalogue';
import type { PosCatalogueItem } from '@/lib/services/catalogue-pos-builder';
import {
  resolvePosPriceConfigured,
  resolvePosPriceMode,
  articleHasDedicatedPricingEngine,
  type PosPriceMode,
  type PosSellableProfile,
} from '@/lib/pos/pos-price-policy';

export type PosPriceGate = {
  /** Bloque uniquement erreur réseau / article introuvable — pas le prix manquant. */
  blocked: boolean;
  /** Prix non finalisé mais configurateur accessible. */
  pricePending: boolean;
  priceMode: PosPriceMode;
  reason: string | null;
  adminHref: string | null;
};

/** Décide si le configurateur POS doit être bloqué (erreur catalogue uniquement). */
export function usePosPriceGate(params: {
  articleId: string;
  article: CatalogueItem | undefined;
  apiArticle: PosCatalogueItem | null;
  apiArticleLoaded: boolean;
  articleLoadError?: string | null;
  articleNotFound?: boolean;
}): PosPriceGate {
  const {
    articleId,
    article,
    apiArticle,
    apiArticleLoaded,
    articleLoadError,
    articleNotFound,
  } = params;

  return useMemo(() => {
    if (articleLoadError) {
      return {
        blocked: true,
        pricePending: false,
        priceMode: 'to_configure' as PosPriceMode,
        reason: articleLoadError,
        adminHref: null,
      };
    }
    if (apiArticleLoaded && articleNotFound && !article) {
      return {
        blocked: true,
        pricePending: false,
        priceMode: 'to_configure' as PosPriceMode,
        reason: 'Article introuvable dans le catalogue POS publié',
        adminHref: '/administration/catalogue-pos',
      };
    }

    const posItem = apiArticle ?? (article as PosCatalogueItem | undefined);

    const profile: PosSellableProfile | undefined = posItem
      ? {
          articleId,
          status: posItem.profileStatus ?? 'draft',
          // Ne pas confondre grille catalogue et prixBase Admin : le builder a déjà tranché.
          prixBase: posItem.prixDepart ?? null,
          active: posItem.visiblePos !== false,
        }
      : undefined;

    const priceState = resolvePosPriceConfigured(profile);
    const priceMode =
      posItem?.priceMode
      ?? resolvePosPriceMode(profile, {
        directSaleUnitPrice: posItem?.directSale?.unitPrice,
        requiresQuoteIfCustom: posItem?.directSale?.requiresQuoteIfCustom,
      });

    // Source de vérité catalogue Admin (déjà évaluée avec m² / formules / moteurs dédiés).
    // Moteurs dédiés (carterie, flyer, ISF…) = toujours calculables → jamais « en attente Admin ».
    const dedicated = articleHasDedicatedPricingEngine(articleId, posItem?.category);
    const pricePending = dedicated
      ? false
      : posItem?.priceConfigured === true
        ? false
        : posItem?.priceConfigured === false
          ? true
          : !priceState.configured;

    return {
      blocked: false,
      pricePending,
      priceMode,
      reason: pricePending ? (posItem?.priceMissingReason ?? priceState.reason) : null,
      adminHref: posItem?.adminFixHref
        ?? priceState.adminHref
        ?? `/administration/catalogue-pos?article=${encodeURIComponent(articleId)}`,
    };
  }, [articleId, article, apiArticle, apiArticleLoaded, articleLoadError, articleNotFound]);
}

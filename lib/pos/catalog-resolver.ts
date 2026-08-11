import {
  BLOC_NOTE_CANONICAL_ID,
  BLOC_NOTE_LEGACY_PREFILL,
  blocNoteLegacyPrefill,
  isBlocNoteLegacyId,
  type BlocNoteLegacyId,
  resolveBlocNoteCanonicalId,
} from '@/lib/pos/bloc-note-catalog';
import {
  FLYER_CANONICAL_ID,
  FLYER_LEGACY_PREFILL,
  flyerLegacyPrefill,
  isFlyerLegacyId,
  type FlyerLegacyId,
  resolveFlyerCanonicalId,
} from '@/lib/pos/flyer-catalog';
import {
  LIVRES_CANONICAL_ID,
  LIVRES_LEGACY_PREFILL,
  isLivresLegacyId,
  livresLegacyPrefill,
  type LivresLegacyId,
  resolveLivresCanonicalId,
} from '@/lib/pos/livres-catalog';
import {
  plvLegacyPrefill,
  plvLegacyRedirectTarget,
  resolvePlvCanonicalId,
} from '@/lib/pos/plv-catalog';
import {
  autocopiantLegacyPrefill,
  autocopiantLegacyRedirectParams,
  autocopiantLegacyRedirectTarget,
  resolveAutocopiantCanonicalId,
} from '@/lib/pos/autocopiant-catalog';
import {
  BACHE_CANONICAL_ID,
  BACHE_LEGACY_PREFILL,
  bacheLegacyPrefill,
  isBacheLegacyId,
  resolveBacheCanonicalId,
  type BacheLegacyId,
} from '@/lib/pos/bache-catalog';
import {
  impressionSfLegacyPrefill,
  impressionSfLegacyRedirectParams,
  impressionSfLegacyRedirectTarget,
  resolveImpressionSfCanonicalId,
} from '@/lib/pos/impression-sf-catalog';
import {
  resolveTiragePhotoCanonicalId,
  tiragePhotoLegacyPrefill,
  tiragePhotoLegacyRedirectParams,
  tiragePhotoLegacyRedirectTarget,
} from '@/lib/pos/tirage-photo-catalog';
import {
  plexiLegacyPrefill,
  resolvePlexiCanonicalId,
} from '@/lib/pos/plexi-catalog';
import {
  DIRECT_SALE_POS_CANONICAL,
  directSalePosPrefill,
} from '@/lib/pos/direct-sale-pos-redundant';
import {
  PERSONALIZED_DS_TO_CANONICAL,
  personalizedLegacyPrefill,
  resolvePersonalizedCanonicalId,
} from '@/lib/pos/personalized-article-redundant';

export function resolveCatalogCanonicalId(articleId: string): string {
  if (DIRECT_SALE_POS_CANONICAL[articleId]) {
    return DIRECT_SALE_POS_CANONICAL[articleId];
  }
  if (PERSONALIZED_DS_TO_CANONICAL[articleId]) {
    return resolvePersonalizedCanonicalId(articleId);
  }
  return resolveTiragePhotoCanonicalId(
    resolveImpressionSfCanonicalId(
      resolveAutocopiantCanonicalId(
        resolvePlvCanonicalId(
          resolvePlexiCanonicalId(
            resolveBacheCanonicalId(
              resolveLivresCanonicalId(resolveBlocNoteCanonicalId(resolveFlyerCanonicalId(articleId))),
            ),
          ),
        ),
      ),
    ),
  );
}

export function catalogLegacyPrefill(articleId: string): Record<string, string> | null {
  const perso = personalizedLegacyPrefill(articleId);
  if (perso) return perso;
  const ds = directSalePosPrefill(articleId);
  if (ds) return ds;
  const tirage = tiragePhotoLegacyPrefill(articleId);
  if (tirage) return tirage;
  const isf = impressionSfLegacyPrefill(articleId);
  if (isf) return isf;
  const auto = autocopiantLegacyPrefill(articleId);
  if (auto) return auto;
  const fly = flyerLegacyPrefill(articleId);
  if (fly) return fly;
  const bn = blocNoteLegacyPrefill(articleId);
  if (bn) return bn;
  const lv = livresLegacyPrefill(articleId);
  if (lv) return lv;
  const bc = bacheLegacyPrefill(articleId);
  if (bc) return bc;
  const px = plexiLegacyPrefill(articleId);
  if (px) return px;
  return plvLegacyPrefill(articleId);
}

export function catalogLegacyRedirectTarget(articleId: string): string | null {
  const tirage = tiragePhotoLegacyRedirectTarget(articleId);
  if (tirage) return tirage;
  const isf = impressionSfLegacyRedirectTarget(articleId);
  if (isf) return isf;
  const auto = autocopiantLegacyRedirectTarget(articleId);
  if (auto) return auto;
  if (isFlyerLegacyId(articleId)) return FLYER_CANONICAL_ID;
  if (isBlocNoteLegacyId(articleId)) return BLOC_NOTE_CANONICAL_ID;
  if (isLivresLegacyId(articleId)) return LIVRES_CANONICAL_ID;
  if (isBacheLegacyId(articleId)) return BACHE_CANONICAL_ID;
  const plexi = resolvePlexiCanonicalId(articleId);
  if (plexi !== articleId) return plexi;
  return plvLegacyRedirectTarget(articleId);
}

export function catalogLegacyRedirectParams(
  articleId: string,
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams.toString());
  if (tiragePhotoLegacyRedirectTarget(articleId)) {
    return tiragePhotoLegacyRedirectParams(articleId, searchParams);
  }
  const isfParams = impressionSfLegacyRedirectParams(articleId, searchParams);
  if (impressionSfLegacyRedirectTarget(articleId)) return isfParams;
  const autoParams = autocopiantLegacyRedirectParams(articleId, searchParams);
  if (autocopiantLegacyRedirectTarget(articleId)) return autoParams;
  const flyPrefill = isFlyerLegacyId(articleId) ? FLYER_LEGACY_PREFILL[articleId as FlyerLegacyId] : null;
  if (flyPrefill?.format) {
    params.set('format', flyPrefill.format);
    return params;
  }
  const bnPrefill = isBlocNoteLegacyId(articleId) ? BLOC_NOTE_LEGACY_PREFILL[articleId as BlocNoteLegacyId] : null;
  if (bnPrefill) {
    if (bnPrefill.format) params.set('format', bnPrefill.format);
    if (bnPrefill.produit) params.set('produit', bnPrefill.produit);
    return params;
  }
  const lvPrefill = isLivresLegacyId(articleId) ? LIVRES_LEGACY_PREFILL[articleId as LivresLegacyId] : null;
  if (lvPrefill) {
    if (lvPrefill.type) params.set('type', lvPrefill.type);
    return params;
  }
  const plvPrefill = plvLegacyPrefill(articleId);
  if (plvPrefill) {
    for (const [key, val] of Object.entries(plvPrefill)) {
      params.set(key, val);
    }
  }
  const bcPrefill = isBacheLegacyId(articleId) ? BACHE_LEGACY_PREFILL[articleId as BacheLegacyId] : null;
  if (bcPrefill) {
    for (const [key, val] of Object.entries(bcPrefill)) {
      params.set(key, val);
    }
  }
  return params;
}

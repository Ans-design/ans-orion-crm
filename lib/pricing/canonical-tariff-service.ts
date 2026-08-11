/**
 * Service tarifaire canonique — unique point d’entrée opérationnel.
 *
 * Backoffice publie → DB → ce service lit → POS / devis / commande / GPAO / exports.
 * Ne retourne jamais silencieusement 0 si un tarif obligatoire manque (STRICT / staging / prod).
 */

import type { PriceResult } from '@/lib/pricing/price-types';
import { PriceUnavailableError } from '@/lib/pricing/price-unavailable';
import { getActivePricingReleaseId } from '@/lib/pricing/pricing-release-service';
import {
  isDemoPricingFallbackActive,
  isOperationalStrictPricing,
} from '@/lib/pricing/pricing-mode-policy';
import { roundMga } from '@/lib/money/mga';
import {
  invalidatePricingRuntimeCache,
  pricingCacheGet,
  pricingCacheKey,
  pricingCacheSet,
  getPricingCacheGeneration,
  setPricingCacheReleaseId,
} from '@/lib/pricing/pricing-runtime-cache';
import { resolvePricingFamilyFromArticleId } from '@/lib/pricing/pricing-engine-contract';
import { calculatePrice } from '@/lib/pricing/calculate';

export type CalculatePriceOptions = {
  prixForce?: number;
  totalForce?: number;
  priceReason?: string;
  skipDynamic?: boolean;
};

export type CanonicalTariffErrorCode =
  | 'PRICE_NOT_CONFIGURED'
  | 'DRAFT_NOT_PUBLISHED'
  | 'AMBIGUOUS_OPTION'
  | 'NEGATIVE_OR_ZERO_FORBIDDEN'
  | 'ENGINE_ERROR';

export type CanonicalTariffComponent = {
  key: string;
  label: string;
  amountAr: number;
};

export type CanonicalTariffResult = {
  ok: boolean;
  articleId: string;
  family: string;
  qty: number;
  unitPriceAr: number | null;
  totalHtAr: number | null;
  totalTtcAr: number | null;
  priceSource: string;
  provenance: 'database-published' | 'demo-fallback' | 'force-override' | 'unavailable';
  tariffVersion: string | null;
  releaseId: string | null;
  formulaVersion: number | null;
  effectiveAt: string;
  components: CanonicalTariffComponent[];
  rounding: { currency: 'MGA'; decimals: 0; mode: 'half-up' };
  explain: Record<string, unknown>;
  error?: { code: CanonicalTariffErrorCode; message: string };
  /** Résultat legacy pour adaptateurs existants */
  legacy?: PriceResult;
};

function snapshotPriceSource(result: PriceResult): string {
  const src = result.snapshot?.priceSource;
  return typeof src === 'string' ? src : 'unknown';
}

function isUnavailableResult(result: PriceResult): boolean {
  if (result.snapshot?.priceNotConfigured === true) return true;
  const src = snapshotPriceSource(result);
  if (src === 'priceNotConfigured' || src === 'prixDepart') {
    if (isOperationalStrictPricing() && !isDemoPricingFallbackActive()) return true;
  }
  if (
    isOperationalStrictPricing()
    && result.pricingMode === 'auto'
    && roundMga(result.prixUnitaire) <= 0
    && roundMga(result.totalHT) <= 0
  ) {
    return true;
  }
  return false;
}

function buildComponents(result: PriceResult): CanonicalTariffComponent[] {
  const comps: CanonicalTariffComponent[] = [
    { key: 'unit', label: 'Prix unitaire', amountAr: roundMga(result.prixUnitaire) },
    { key: 'sousTotal', label: 'Sous-total', amountAr: roundMga(result.sousTotal) },
  ];
  if (result.remiseAmount > 0) {
    comps.push({ key: 'remise', label: 'Remise', amountAr: -roundMga(result.remiseAmount) });
  }
  if (result.clicheFee > 0) {
    comps.push({ key: 'cliche', label: 'Frais cliché', amountAr: roundMga(result.clicheFee) });
  }
  comps.push({ key: 'totalHT', label: 'Total HT', amountAr: roundMga(result.totalHT) });
  comps.push({ key: 'totalTTC', label: 'Total TTC', amountAr: roundMga(result.totalTTC) });
  return comps;
}

export type CanonicalTariffInput = {
  articleId: string;
  config?: Record<string, unknown>;
  qty?: number;
  options?: CalculatePriceOptions;
  /** Bypass cache (après lecture fraîche post-publish). */
  skipCache?: boolean;
};

/**
 * Calcule un tarif explicable. Point d’entrée unique recommandé pour POS/devis/commande.
 */
export async function resolveCanonicalTariff(input: CanonicalTariffInput): Promise<CanonicalTariffResult> {
  const articleId = String(input.articleId ?? '').trim();
  const config = input.config ?? {};
  const qty = Math.max(1, Math.floor(Number(input.qty) || 1));
  const family = resolvePricingFamilyFromArticleId(articleId);
  const effectiveAt = new Date().toISOString();
  const rounding = { currency: 'MGA' as const, decimals: 0 as const, mode: 'half-up' as const };

  if (!articleId) {
    return {
      ok: false,
      articleId: '',
      family,
      qty,
      unitPriceAr: null,
      totalHtAr: null,
      totalTtcAr: null,
      priceSource: 'unavailable',
      provenance: 'unavailable',
      tariffVersion: null,
      releaseId: null,
      formulaVersion: null,
      effectiveAt,
      components: [],
      rounding,
      explain: {},
      error: { code: 'PRICE_NOT_CONFIGURED', message: 'articleId manquant' },
    };
  }

  let releaseId: string | null = null;
  try {
    releaseId = await getActivePricingReleaseId();
    setPricingCacheReleaseId(releaseId);
  } catch {
    releaseId = null;
  }

  const cacheKey = pricingCacheKey([
    'canon',
    getPricingCacheGeneration(),
    releaseId,
    articleId,
    qty,
    JSON.stringify(config),
    input.options?.prixForce,
    input.options?.totalForce,
  ]);

  if (!input.skipCache) {
    const cached = pricingCacheGet<CanonicalTariffResult>(cacheKey);
    if (cached) return cached;
  }

  let legacy: PriceResult | null;
  try {
    legacy = await calculatePrice(articleId, { ...config, qty }, input.options);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur moteur tarifaire';
    return {
      ok: false,
      articleId,
      family,
      qty,
      unitPriceAr: null,
      totalHtAr: null,
      totalTtcAr: null,
      priceSource: 'engine_error',
      provenance: 'unavailable',
      tariffVersion: null,
      releaseId,
      formulaVersion: null,
      effectiveAt,
      components: [],
      rounding,
      explain: { error: message },
      error: { code: 'ENGINE_ERROR', message },
    };
  }

  if (!legacy) {
    return {
      ok: false,
      articleId,
      family,
      qty,
      unitPriceAr: null,
      totalHtAr: null,
      totalTtcAr: null,
      priceSource: 'unavailable',
      provenance: 'unavailable',
      tariffVersion: null,
      releaseId,
      formulaVersion: null,
      effectiveAt,
      components: [],
      rounding,
      explain: {},
      error: {
        code: 'PRICE_NOT_CONFIGURED',
        message: `Article introuvable ou sans tarif : « ${articleId} »`,
      },
    };
  }

  const priceSource = snapshotPriceSource(legacy);
  const formulaVersion =
    typeof legacy.snapshot?.formulaVersion === 'number'
      ? legacy.snapshot.formulaVersion
      : null;

  if (isUnavailableResult(legacy)) {
    const result: CanonicalTariffResult = {
      ok: false,
      articleId,
      family,
      qty,
      unitPriceAr: null,
      totalHtAr: null,
      totalTtcAr: null,
      priceSource: 'priceNotConfigured',
      provenance: 'unavailable',
      tariffVersion: releaseId,
      releaseId,
      formulaVersion,
      effectiveAt,
      components: [],
      rounding,
      explain: {
        ...legacy.snapshot,
        demoFallback: isDemoPricingFallbackActive(),
        strict: isOperationalStrictPricing(),
      },
      error: {
        code: 'PRICE_NOT_CONFIGURED',
        message: `Tarif obligatoire manquant pour « ${articleId} » — publier depuis le Backoffice.`,
      },
      legacy,
    };
    return result;
  }

  const demo = isDemoPricingFallbackActive() && (priceSource === 'prixDepart' || priceSource === 'catalogue');
  const forced = legacy.pricingMode === 'force_pu' || legacy.pricingMode === 'force_total';

  const result: CanonicalTariffResult = {
    ok: true,
    articleId,
    family,
    qty,
    unitPriceAr: roundMga(legacy.prixUnitaire),
    totalHtAr: roundMga(legacy.totalHT),
    totalTtcAr: roundMga(legacy.totalTTC),
    priceSource,
    provenance: forced ? 'force-override' : demo ? 'demo-fallback' : 'database-published',
    tariffVersion: releaseId ?? (formulaVersion != null ? `formula-v${formulaVersion}` : priceSource),
    releaseId,
    formulaVersion,
    effectiveAt,
    components: buildComponents(legacy),
    rounding,
    explain: {
      formulaApplied: legacy.formulaApplied,
      snapshot: legacy.snapshot,
      cacheGeneration: getPricingCacheGeneration(),
    },
    legacy,
  };

  pricingCacheSet(cacheKey, result);
  return result;
}

/** Variante stricte — throw métier si indisponible. */
export async function resolveCanonicalTariffOrThrow(input: CanonicalTariffInput): Promise<CanonicalTariffResult> {
  const r = await resolveCanonicalTariff(input);
  if (!r.ok || r.unitPriceAr == null) {
    throw new PriceUnavailableError(r.error?.message ?? `Prix indisponible pour ${input.articleId}`);
  }
  return r;
}

export { invalidatePricingRuntimeCache };

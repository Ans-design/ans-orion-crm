import { getProductConfig } from '@/lib/data/config-types';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import { prisma } from '@/lib/prisma';
import {
  applyFixedFees,
  applyProductionMultiplier,
  getGlobalPricingConfig,
  getPricingCoeffNumbers,
  DEFAULT_FACE_RECTO_VERSO_MULT,
  DEFAULT_FINITION_SURCHARGE_PCT,
} from '@/lib/pricing/global-config';
import { DEFAULT_GLOBAL_PRICING } from '@/lib/data/global-pricing';
import { lookupSalePrice2026ForArticle } from '@/lib/services/sale-price-service';
import { resolvePackagingMaterialRecap } from '@/lib/packaging/material-recap';
import { computeGrandFormatM2 } from '@/lib/pricing/format-dimensions';
import { isGrandFormatArticleId } from '@/lib/grand-format/article-meta';
import { isGrandFormatCustomFormat } from '@/lib/grand-format/pricing';
import { calculateGrandFormatPrice } from '@/lib/grand-format/calculate-grand-format-price';
import { loadGrandFormatStockProfile, resolveAvailableLaizesCm } from '@/lib/grand-format/stock-profile';
import { isBacheArticleId, bacheLegacyPrefill } from '@/lib/pos/bache-catalog';
import { resolvePlaqueThicknessPrixM2 } from '@/lib/grand-format/plaque-thickness-pricing';
import { evaluateBache } from '@/lib/grand-format/bache-rules';
import { bacheEvalToGfBillable } from '@/lib/grand-format/bache-bridge';
import type { GrandFormatBillableResult } from '@/lib/grand-format/types';
import { loadGfAdminPricingToRuntime } from '@/lib/services/gf-admin-pricing.service';
import { loadGfCuttingMarginsToRuntime } from '@/lib/services/gf-cutting-margins.service';
import { pickTierUnitPrice, pickAppliedConfigTier, pickAppliedDbTier } from '@/lib/pricing/tier-price';
import { volumeRemiseAmount, volumeRemiseRate } from '@/lib/pricing/volume-remise';
import {
  pickDiscountTiersForVariant,
  resolvePricingVariantKey,
} from '@/lib/pricing/ans-palier-remise-map';
import {
  applyFinitionSurcharge,
  isRectoVerso,
  resolveConfigFace,
  resolveForcedUnitPrice,
} from '@/lib/pricing/config-normalize';
import {
  applyFinitionArticlePricing,
  finitionPricingContext,
  isStandaloneFinitionArticle,
  shouldSkipRectoVersoMultiplier,
} from '@/lib/finition/finition-pricing';
import {
  blocNoteVolumeRemiseRate,
  computeBlocNotePrice,
  isBlocNoteArticleId,
  blocNotePriceSummaryNote,
} from '@/lib/pricing/bloc-note-pricing';
import {
  carnetAutocopiantVolumeRemiseRate,
  computeCarnetAutocopiantPrice,
  isCarnetAutocopiantArticleId,
} from '@/lib/pricing/carnet-autocopiant-pricing';
import { ensureCarnetAutocopiantParamsReady } from '@/lib/services/carnet-autocopiant-sync.service';
import {
  computeStampPrice,
  isStampArticleId,
} from '@/lib/pricing/stamp-pricing';
import { ensureStampFormatsReady } from '@/lib/services/stamp-formats-sync.service';
import {
  computePhotobookPrice,
  isPhotobookArticleId,
} from '@/lib/pricing/photobook-pricing';
import { ensurePhotobookParamsReady } from '@/lib/services/photobook-sync.service';
import {
  computeTiragePhotoPrice,
  isTiragePhotoArticleId,
} from '@/lib/pricing/tirage-photo-pricing';
import { ensureTiragePhotoParamsReady } from '@/lib/services/tirage-photo-sync.service';
import { ensurePlvDirectSalePricesSynced } from '@/lib/services/plv-direct-sale-price-sync.service';
import {
  computeCadrePhotoPrice,
  isCadrePhotoArticleId,
} from '@/lib/pricing/cadre-photo-pricing';
import { ensureCadrePhotoReady } from '@/lib/services/cadre-photo-sync.service';
import {
  applyImpressionSfFormatPrice,
  ansCalcRectoVersoPrice,
  computeImpressionSfPrice,
  getImpressionSfFaceRules,
  getImpressionSfTechRules,
  impressionSfVolumeRemiseAmount,
  impressionSfVolumeRemiseRate,
  isImpressionSfPricingArticle,
} from '@/lib/pricing/impression-sf-pricing';
import {
  applyTechnologySupplement,
  findLaserSupplementAr,
  isOffsetStandardMaterial,
  parseImpressionType,
} from '@/lib/pricing/print-type-rules';
import { impressionSfMaterialByLabel } from '@/lib/data/impression-sf-material-catalog';
import { ensureImpressionSfRuntimeReady } from '@/lib/services/pricing-rules-sync.service';
import { isRectoVersoAllowedForSupport } from '@/lib/pricing/support-face-rules';
import {
  computePlvPrice,
  isPlvPricingArticle,
  plvVolumeRemiseRate,
} from '@/lib/pricing/plv-pricing';
import {
  computeLivresPrice,
  isLivresPricingArticle,
  livresPriceSummaryNote,
} from '@/lib/pricing/livres-pricing';
import {
  isTextileArticleId,
  resolveTextilePriceResult,
} from '@/lib/pricing/textile-pricing';
import {
  computeCalendarPrice,
  isCalendarPricingArticle,
  calendarPriceSummaryNote,
} from '@/lib/pricing/calendar-pricing';
import { computeCustomSurfacePrice } from '@/lib/pricing/custom-surface-pricing';
import { tryComputeDynamicPrice } from '@/lib/pricing/dynamic-engine';
import { tryComputePrix2026GridPrice } from '@/lib/pricing/prix-2026-grid-price';
import { articleHasPrix2026Grid } from '@/lib/data/prix-2026-grids';
import { isPrix2026LegacyEnabled } from '@/lib/pricing/prix-2026-legacy';
import { lookupPublishedBasePrintingPrice } from '@/lib/server/modules/pricing/base-printing-price.service';
import { articleHasDedicatedPricingEngine, isStrictPosPricing } from '@/lib/pos/pos-price-policy';
import { isDemoPricingFallbackAllowed } from '@/lib/pricing/pricing-mode-policy';
import {
  computeEventArticlePrice,
  isEventPricingArticleId,
} from '@/lib/pricing/event-pricing';
import { ensureEventPricingRuntimeReady } from '@/lib/services/event-pricing-sync.service';
import {
  computeFlyerPrice,
  isFlyerPricingArticle,
  flyerPriceSummaryNote,
} from '@/lib/pricing/flyer-pricing';
import {
  computeCarteriePrice,
  isCarteriePricingArticle,
  carteriePriceSummaryNote,
} from '@/lib/pricing/carterie-pricing';
import {
  calculateHangtagPriceFromConfig,
  hangtagPriceSummaryNote,
  isHangtagPricingArticle,
} from '@/lib/packaging/hangtag-price';
import {
  calculatePaperBagPriceFromConfig,
  isPaperBagPricingArticle,
  paperBagPriceSummaryNote,
} from '@/lib/packaging/paper-bag-price';
import { ensureSoftPackagingPricingRuntimeReady } from '@/lib/services/soft-packaging-pricing-sync.service';
import { ensurePaperBagPricingRuntimeReady } from '@/lib/services/paper-bag-pricing-sync.service';
import { ensurePackagingPricingRuntimeReady } from '@/lib/services/packaging-pricing-sync.service';
import { buildPackagingBoxPriceSnapshotV2 } from '@/lib/packaging/packaging-snapshot';
import {
  calculatePackagingBoxPriceFromConfig,
  isPackagingBoxPricingArticle,
  packagingBoxPriceSummaryNote,
} from '@/lib/packaging/packaging-box-price';
import {
  calculateDoypackPriceFromConfig,
  doypackPriceSummaryNote,
  isDoypackPricingArticle,
} from '@/lib/packaging/doypack-price';
import {
  calculatePrecutLabelPriceFromConfig,
  isPrecutLabelPricingArticle,
  precutLabelPriceSummaryNote,
} from '@/lib/packaging/precut-label-price';
import {
  calculateCustomCupPriceFromConfig,
  customCupPriceSummaryNote,
  isCustomCupPricingArticle,
} from '@/lib/packaging/custom-cup-price';

const DEDICATED_UNIT_PRICE_SOURCES = new Set([
  'salePrice2026',
  'basePrintingNoFinish',
  'impressionSfTarif',
  'flyerIsfPliage',
  'carterieIsfImposition',
  'packagingBoxIsfFinitions',
  'paperBagIsfFinitions',
  'doypackSoftPackaging',
  'precutLabelVinyl',
  'customCupSoftPackaging',
  'hangtagIsfImposition',
  'carnetAutocopiantTarif',
  'stampTarif',
  'photobookTarif',
  'tiragePhotoTarif',
  'cadrePhotoTarif',
  'blocNoteTarif',
  'plvTarif',
  'livresTarif',
  'calendarTarif',
  'calendarSurDevis',
  'calendarIncomplete',
  'bacheEngine',
  'gfLaizeSurface',
  'gfSurfaceA0',
  'gfStandardA0',
  'gfLaizeBillable',
  'gfSurDevis',
  'dynamicBacheEngine',
  'dynamicGfLaize',
  'dynamicGfStandard',
  'customSurfaceM2',
  'customSurfaceCm2',
  'textileAdmin',
  'prix2026ExcelGrid',
  'eventPromoIsf',
  'eventBadgeTarif',
  'eventTicketTarif',
  'eventBraceletTarif',
  'eventLanyardTarif',
  'eventChequeIsf',
  'eventEnvelopeTarif',
  'eventFanionTarif',
  'eventPhotoboothTarif',
  'eventPhotocallTarif',
  'eventComptoirTarif',
  'eventPochetteTarif',
  'eventSurDevis',
  'livresSurDevis',
  'livresIncomplete',
  'blocNoteSurDevis',
  'blocNoteIncomplete',
  'flyerSurDevis',
  'flyerIncomplete',
  'carterieSurDevis',
  'carterieIncomplete',
  'legacySurfaceM2',
]);

/** Empêche dbTarif / prixM2 / prixCm2 d’écraser un moteur dédié, un sur-devis ou un état incomplet. */
function isProtectedPriceSource(priceSource: string): boolean {
  return (
    DEDICATED_UNIT_PRICE_SOURCES.has(priceSource)
    || priceSource.endsWith('SurDevis')
    || priceSource.endsWith('Incomplete')
  );
}

/** Moteurs qui tarifent déjà les finitions (pas de +12 % générique). */
function shouldSkipGenericFinitionSurcharge(priceSource: string): boolean {
  if (
    priceSource === 'plvTarif'
    || priceSource === 'packagingBoxIsfFinitions'
    || priceSource === 'paperBagIsfFinitions'
    || priceSource === 'doypackSoftPackaging'
    || priceSource === 'precutLabelVinyl'
    || priceSource === 'customCupSoftPackaging'
    || priceSource === 'hangtagIsfImposition'
    || priceSource === 'carterieIsfImposition'
    || priceSource === 'livresTarif'
    || priceSource === 'blocNoteTarif'
    || priceSource === 'calendarTarif'
    || priceSource === 'flyerIsfPliage'
    || priceSource === 'impressionSfTarif'
    || priceSource === 'basePrintingNoFinish'
    || priceSource === 'photobookTarif'
    || priceSource === 'tiragePhotoTarif'
    || priceSource === 'cadrePhotoTarif'
    || priceSource === 'stampTarif'
    || priceSource === 'carnetAutocopiantTarif'
  ) {
    return true;
  }
  // Event : ISF / accessoires / pelliculage déjà dans le moteur dédié
  if (priceSource.startsWith('event') && (priceSource.endsWith('Tarif') || priceSource.endsWith('Isf') || priceSource.endsWith('Incomplete') || priceSource.endsWith('SurDevis'))) {
    return true;
  }
  return false;
}

async function safeDbTarifs(articleId: string) {
  try {
    return await prisma.tarif.findMany({ where: { articleId, actif: true }, orderBy: { palier: 'asc' } });
  } catch {
    return [];
  }
}

async function safeGlobalPricingConfig() {
  try {
    return await getGlobalPricingConfig();
  } catch {
    return DEFAULT_GLOBAL_PRICING;
  }
}

async function safePriceFormula(articleId: string) {
  try {
    return await prisma.priceFormula.findFirst({ where: { articleId, active: true } });
  } catch {
    return null;
  }
}

import { normalizeQty, type PriceResult } from '@/lib/pricing/price-types';

export type { PriceResult } from '@/lib/pricing/price-types';
export { normalizeQty } from '@/lib/pricing/price-types';

export async function calculatePrice(
  articleId: string,
  config: Record<string, unknown>,
  options?: { prixForce?: number; totalForce?: number; priceReason?: string; skipDynamic?: boolean },
): Promise<PriceResult | null> {
  let article = findCatalogueItem(articleId);
  if (!article) {
    // SKU Admin / DB-only absents du catalogue statique : résoudre via profil publié.
    try {
      const { resolveCatalogueItemFromDb } = await import('@/lib/services/catalogue-service');
      article = (await resolveCatalogueItemFromDb(articleId)) ?? undefined;
    } catch {
      article = undefined;
    }
  }
  if (!article) return null;

  const productConfig = getProductConfig(articleId, article.configType);
  const rawQty = config.qty ?? config.quantite ?? config.quantity ?? config.qte ?? 1;

  // Moteurs dédiés (tirage photo, tampon, photobook, textile…) : ne pas court-circuiter
  // via ArticlePricingProfile.prixBase (ex. ancien 350 Ar) du moteur dynamique.
  if (!options?.skipDynamic && !articleHasDedicatedPricingEngine(articleId, article.category)) {
    const dynamicPrice = await tryComputeDynamicPrice(articleId, config, options);
    if (dynamicPrice) return dynamicPrice;
  }

  // Textile Admin (formules support + marquage + MO) avant tout forfait Excel.
  if (isTextileArticleId(articleId)) {
    const textilePrice = await resolveTextilePriceResult(articleId, config, options);
    if (textilePrice) return textilePrice;
  }

  // Grilles Excel forfait pièce — archive uniquement (USE_PRIX_2026_LEGACY=true) et hors STRICT.
  if (
    isPrix2026LegacyEnabled()
    && !isStrictPosPricing()
    && articleHasPrix2026Grid(articleId)
    && !isCarteriePricingArticle(articleId, article.category)
    && !isFlyerPricingArticle(articleId, article.category)
    && !isGrandFormatArticleId(articleId)
    && !isPlvPricingArticle(articleId)
    && !isTextileArticleId(articleId)
  ) {
    const excelPrice = await tryComputePrix2026GridPrice(articleId, config, options);
    if (excelPrice) return excelPrice;
  }

  let qty = normalizeQty(rawQty);
  if (config.tailles && typeof config.tailles === 'object' && !Array.isArray(config.tailles)) {
    qty = Object.values(config.tailles as Record<string, number>).reduce((s, q) => s + (Number(q) || 0), 0) || qty;
  }

  let prixUnit = 0;
  // prixDepart catalogue : uniquement mode démo locale explicite — jamais staging/prod/STRICT.
  const allowCatalogueFallback =
    !isStrictPosPricing() && isDemoPricingFallbackAllowed();
  let priceSource: string = allowCatalogueFallback ? 'prixDepart' : 'priceNotConfigured';
  if (allowCatalogueFallback) {
    prixUnit = article.prixDepart ?? 0;
  }
  let salePrice2026Id: string | null = null;
  let basePrintingId: string | null = null;
  let faceAlreadyInPrice = false;

  // Flags moteurs — un seul chemin DB ensure par article
  const isFlyerArticle = isFlyerPricingArticle(articleId, article.category);
  const isCarterieArticle = isCarteriePricingArticle(articleId, article.category);
  const isPackagingBoxArticle = isPackagingBoxPricingArticle(articleId);
  const isPaperBagArticle = isPaperBagPricingArticle(articleId);
  const isDoypackArticle = isDoypackPricingArticle(articleId);
  const isPrecutLabelArticle = isPrecutLabelPricingArticle(articleId);
  const isCustomCupArticle = isCustomCupPricingArticle(articleId);
  const isHangtagArticle = isHangtagPricingArticle(articleId);
  const isSoftPackagingArticle =
    isDoypackArticle || isPrecutLabelArticle || isCustomCupArticle || isHangtagArticle;
  const isIsfArticle = isImpressionSfPricingArticle(articleId, article.category);
  const isLivresArticle = isLivresPricingArticle(articleId);
  const isBnArticle = isBlocNoteArticleId(articleId);
  const isCalArticle = isCalendarPricingArticle(articleId);
  const isEventArticle = isEventPricingArticleId(articleId);
  const needsIsfRuntime =
    isFlyerArticle
    || isCarterieArticle
    || isPackagingBoxArticle
    || isPaperBagArticle
    || isHangtagArticle
    || isIsfArticle
    || isLivresArticle
    || isBnArticle
    || isCalArticle
    || isEventArticle
    || isCarnetAutocopiantArticleId(articleId);

  if (needsIsfRuntime) {
    await ensureImpressionSfRuntimeReady();
  }

  // Admin FinishingPrice → overlays (finitions standalone + packaging)
  if (
    isStandaloneFinitionArticle(articleId)
    || isPackagingBoxArticle
    || isPaperBagArticle
    || isDoypackArticle
    || isPrecutLabelArticle
    || isCustomCupArticle
    || isHangtagArticle
  ) {
    const { ensureFinitionRuntimePricesReady } = await import(
      '@/lib/services/finition-runtime-sync.service'
    );
    await ensureFinitionRuntimePricesReady();
  }

  if (isPackagingBoxArticle) {
    await ensurePackagingPricingRuntimeReady();
  }
  if (isPaperBagArticle) {
    await ensurePaperBagPricingRuntimeReady();
  }
  if (isSoftPackagingArticle) {
    await ensureSoftPackagingPricingRuntimeReady();
  }

  let bnPricing = null as ReturnType<typeof computeBlocNotePrice> | null;
  if (isBnArticle) {
    const { ensurePublicationPricingRuntimeReady } = await import(
      '@/lib/services/publication-pricing-sync.service'
    );
    await ensurePublicationPricingRuntimeReady();
    bnPricing = computeBlocNotePrice(config, qty);
  }
  let carnetPricing = null as ReturnType<typeof computeCarnetAutocopiantPrice> | null;
  if (isCarnetAutocopiantArticleId(articleId)) {
    await ensureCarnetAutocopiantParamsReady();
    carnetPricing = computeCarnetAutocopiantPrice(config);
  }
  let stampPricing = null as ReturnType<typeof computeStampPrice> | null;
  if (isStampArticleId(articleId)) {
    await ensureStampFormatsReady();
    stampPricing = computeStampPrice(config);
  }
  let photobookPricing = null as ReturnType<typeof computePhotobookPrice> | null;
  if (isPhotobookArticleId(articleId)) {
    await ensurePhotobookParamsReady();
    photobookPricing = computePhotobookPrice(config);
  }
  let tiragePhotoPricing = null as ReturnType<typeof computeTiragePhotoPrice> | null;
  if (isTiragePhotoArticleId(articleId)) {
    await ensureTiragePhotoParamsReady();
    tiragePhotoPricing = computeTiragePhotoPrice(config);
  }
  let cadrePhotoPricing = null as ReturnType<typeof computeCadrePhotoPrice> | null;
  if (isCadrePhotoArticleId(articleId)) {
    await ensureCadrePhotoReady();
    cadrePhotoPricing = computeCadrePhotoPrice(config);
  }
  let plvPricing = null as ReturnType<typeof computePlvPrice> | null;
  if (isPlvPricingArticle(articleId)) {
    try {
      await ensurePlvDirectSalePricesSynced();
    } catch {
      /* DirectSale sync optionnel — fallback Excel / surface */
    }
    plvPricing = computePlvPrice(articleId, config, qty);
  }
  let livresPricing = null as ReturnType<typeof computeLivresPrice> | null;
  if (isLivresArticle) {
    const { ensurePublicationPricingRuntimeReady } = await import(
      '@/lib/services/publication-pricing-sync.service'
    );
    await ensurePublicationPricingRuntimeReady();
    livresPricing = computeLivresPrice(articleId, config, qty);
  }
  let calendarPricing = null as ReturnType<typeof computeCalendarPrice> | null;
  if (isCalArticle) {
    const { ensurePublicationPricingRuntimeReady } = await import(
      '@/lib/services/publication-pricing-sync.service'
    );
    await ensurePublicationPricingRuntimeReady();
    calendarPricing = computeCalendarPrice(articleId, config, productConfig, qty);
  }

  let eventPricing = null as ReturnType<typeof computeEventArticlePrice> | null;
  if (isEventArticle) {
    await ensureEventPricingRuntimeReady();
    eventPricing = computeEventArticlePrice(articleId, config, qty);
  }

  let flyerPricing = null as ReturnType<typeof computeFlyerPrice> | null;
  if (isFlyerArticle) {
    const { ensureFlyerPricingRuntimeReady } = await import('@/lib/services/flyer-pricing-sync.service');
    await ensureFlyerPricingRuntimeReady();
    flyerPricing = computeFlyerPrice(config, qty);
  }

  let carteriePricing = null as ReturnType<typeof computeCarteriePrice> | null;
  if (isCarterieArticle) {
    const { ensureCarteriePricingRuntimeReady } = await import('@/lib/services/carterie-pricing-sync.service');
    await ensureCarteriePricingRuntimeReady();
    carteriePricing = computeCarteriePrice(config, qty);
  }

  let packagingBoxPricing = null as ReturnType<typeof calculatePackagingBoxPriceFromConfig> | null;
  if (isPackagingBoxArticle) {
    packagingBoxPricing = calculatePackagingBoxPriceFromConfig(config, qty);
  }

  let paperBagPricing = null as ReturnType<typeof calculatePaperBagPriceFromConfig> | null;
  if (isPaperBagArticle) {
    paperBagPricing = calculatePaperBagPriceFromConfig(config, qty);
  }

  let doypackPricing = null as ReturnType<typeof calculateDoypackPriceFromConfig> | null;
  if (isDoypackArticle) doypackPricing = calculateDoypackPriceFromConfig(config, qty);

  let precutLabelPricing = null as ReturnType<typeof calculatePrecutLabelPriceFromConfig> | null;
  if (isPrecutLabelArticle) precutLabelPricing = calculatePrecutLabelPriceFromConfig(config, qty);

  let customCupPricing = null as ReturnType<typeof calculateCustomCupPriceFromConfig> | null;
  if (isCustomCupArticle) customCupPricing = calculateCustomCupPriceFromConfig(config, qty);

  let hangtagPricing = null as ReturnType<typeof calculateHangtagPriceFromConfig> | null;
  if (isHangtagArticle) hangtagPricing = calculateHangtagPriceFromConfig(config, qty);

  const isfPricing = isIsfArticle ? computeImpressionSfPrice(config, qty) : null;

  // Skip lookups legacy lourds si moteur dédié (Flyer/Carterie/ISF/livres…)
  const skipLegacyPriceLookups = articleHasDedicatedPricingEngine(articleId, article.category);
  const basePrinting = skipLegacyPriceLookups
    ? null
    : await lookupPublishedBasePrintingPrice(articleId, config);
  const sale2026 = skipLegacyPriceLookups || !isPrix2026LegacyEnabled()
    ? null
    : await lookupSalePrice2026ForArticle(articleId, article.name, config, qty);

  if (eventPricing?.calculable && eventPricing.priceSource) {
    prixUnit = eventPricing.prixUnitaire;
    priceSource = eventPricing.priceSource;
    faceAlreadyInPrice = true;
  } else if (eventPricing?.surDevis) {
    prixUnit = 0;
    priceSource = 'eventSurDevis';
    faceAlreadyInPrice = true;
  } else if (eventPricing && !eventPricing.calculable) {
    // Ex. delegate_grand_format : ne jamais retomber sur dbTarif / prixDepart
    prixUnit = 0;
    priceSource = 'eventIncomplete';
    faceAlreadyInPrice = true;
  } else if (tiragePhotoPricing?.calculable) {
    prixUnit = tiragePhotoPricing.prixUnitaire;
    priceSource = 'tiragePhotoTarif';
    faceAlreadyInPrice = true;
  } else if (tiragePhotoPricing?.surDevis) {
    prixUnit = 0;
    priceSource = 'tiragePhotoSurDevis';
  } else if (cadrePhotoPricing?.calculable) {
    prixUnit = cadrePhotoPricing.prixUnitaire;
    priceSource = 'cadrePhotoTarif';
    faceAlreadyInPrice = true;
  } else if (cadrePhotoPricing?.surDevis) {
    prixUnit = 0;
    priceSource = 'cadrePhotoSurDevis';
  } else if (photobookPricing?.calculable) {
    prixUnit = photobookPricing.prixUnitaire;
    priceSource = 'photobookTarif';
    faceAlreadyInPrice = true;
  } else if (photobookPricing?.surDevis) {
    prixUnit = 0;
    priceSource = 'photobookSurDevis';
  } else if (stampPricing?.calculable) {
    prixUnit = stampPricing.prixUnitaire;
    priceSource = 'stampTarif';
    faceAlreadyInPrice = true;
  } else if (stampPricing?.surDevis) {
    prixUnit = 0;
    priceSource = 'stampSurDevis';
  } else if (carnetPricing?.calculable) {
    prixUnit = carnetPricing.prixUnitaire;
    priceSource = 'carnetAutocopiantTarif';
    faceAlreadyInPrice = true;
  } else if (carnetPricing?.surDevis) {
    prixUnit = 0;
    priceSource = 'carnetAutocopiantSurDevis';
  } else if (flyerPricing?.calculable) {
    // Flyer : ISF + pliage — prioritaire sur basePrinting / priceTiers
    prixUnit = flyerPricing.prixUnitaireAvantRemise;
    priceSource = 'flyerIsfPliage';
    faceAlreadyInPrice = true;
  } else if (flyerPricing && !flyerPricing.calculable) {
    prixUnit = 0;
    priceSource = flyerPricing.surDevis ? 'flyerSurDevis' : 'flyerIncomplete';
  } else if (carteriePricing?.calculable) {
    prixUnit = carteriePricing.prixUnitaireAvantRemise;
    priceSource = 'carterieIsfImposition';
    faceAlreadyInPrice = true;
  } else if (carteriePricing && !carteriePricing.calculable) {
    prixUnit = 0;
    priceSource = carteriePricing.surDevis ? 'carterieSurDevis' : 'carterieIncomplete';
  } else if (packagingBoxPricing?.calculable) {
    prixUnit = packagingBoxPricing.prixUnitaire;
    priceSource = 'packagingBoxIsfFinitions';
    faceAlreadyInPrice = true;
  } else if (packagingBoxPricing && !packagingBoxPricing.calculable) {
    prixUnit = 0;
    priceSource = packagingBoxPricing.surDevis ? 'packagingBoxSurDevis' : 'packagingBoxIncomplete';
  } else if (paperBagPricing?.calculable) {
    prixUnit = paperBagPricing.prixUnitaire;
    priceSource = 'paperBagIsfFinitions';
    faceAlreadyInPrice = true;
  } else if (paperBagPricing && !paperBagPricing.calculable) {
    prixUnit = 0;
    priceSource = paperBagPricing.surDevis ? 'paperBagSurDevis' : 'paperBagIncomplete';
  } else if (doypackPricing?.calculable) {
    prixUnit = doypackPricing.prixUnitaire;
    priceSource = 'doypackSoftPackaging';
    faceAlreadyInPrice = true;
  } else if (doypackPricing && !doypackPricing.calculable) {
    prixUnit = 0;
    priceSource = 'doypackSurDevis';
  } else if (precutLabelPricing?.calculable) {
    prixUnit = precutLabelPricing.prixUnitaire;
    priceSource = 'precutLabelVinyl';
    faceAlreadyInPrice = true;
  } else if (precutLabelPricing && !precutLabelPricing.calculable) {
    prixUnit = 0;
    priceSource = 'precutLabelSurDevis';
  } else if (customCupPricing?.calculable) {
    prixUnit = customCupPricing.prixUnitaire;
    priceSource = 'customCupSoftPackaging';
    faceAlreadyInPrice = true;
  } else if (customCupPricing && !customCupPricing.calculable) {
    prixUnit = 0;
    priceSource = 'customCupSurDevis';
  } else if (hangtagPricing?.calculable) {
    prixUnit = hangtagPricing.prixUnitaire;
    priceSource = 'hangtagIsfImposition';
    faceAlreadyInPrice = true;
  } else if (hangtagPricing && !hangtagPricing.calculable) {
    prixUnit = 0;
    priceSource = 'hangtagSurDevis';
  } else if (basePrinting?.prixUnitaire) {
    // Prix A4 Admin publié → formules formats + laser + RV (mêmes règles que moteur ISF)
    let pu = basePrinting.prixUnitaire;
    const matiere = String(config.matiere ?? '').trim();
    const mat = impressionSfMaterialByLabel(matiere);
    const parsed = parseImpressionType(String(config.type ?? ''));
    if (isOffsetStandardMaterial(matiere, mat?.id) && parsed.colorMode === 'quadri' && parsed.technology === 'laser') {
      // Si la ligne DB n'est pas déjà laser, appliquer le supplément Admin
      if (basePrinting.printTechnology !== 'laser') {
        const supplement = findLaserSupplementAr(getImpressionSfTechRules(), {
          offsetOnly: true,
          colorMode: 'quadri',
        });
        pu = applyTechnologySupplement(pu, supplement);
      }
    }
    const formatted = applyImpressionSfFormatPrice(pu, config);
    if (formatted.surDevis) {
      prixUnit = 0;
      priceSource = 'impressionSfSurDevis';
    } else {
      pu = formatted.prixUnitaire;
      if (isRectoVerso(resolveConfigFace(config))) {
        if (!isRectoVersoAllowedForSupport(matiere, getImpressionSfFaceRules())) {
          prixUnit = 0;
          priceSource = 'impressionSfSurDevis';
        } else {
          prixUnit = ansCalcRectoVersoPrice(pu);
          priceSource = 'basePrintingNoFinish';
          basePrintingId = basePrinting.rowId;
          faceAlreadyInPrice = true;
        }
      } else {
        prixUnit = pu;
        priceSource = 'basePrintingNoFinish';
        basePrintingId = basePrinting.rowId;
        faceAlreadyInPrice = true;
      }
    }
  } else if (sale2026?.salePriceAr) {
    prixUnit = sale2026.salePriceAr;
    priceSource = 'salePrice2026';
      salePrice2026Id = sale2026.rowId ?? sale2026.sourceId;
    faceAlreadyInPrice = sale2026.faceInRow;
  } else if (isfPricing?.calculable) {
    prixUnit = isfPricing.prixUnitaire;
    priceSource = 'impressionSfTarif';
    faceAlreadyInPrice = true;
  } else if (isfPricing?.surDevis) {
    prixUnit = 0;
    priceSource = 'impressionSfSurDevis';
  } else if (bnPricing?.calculable) {
    prixUnit = bnPricing.prixUnitaire;
    priceSource = 'blocNoteTarif';
    faceAlreadyInPrice = true;
  } else if (bnPricing && !bnPricing.calculable) {
    prixUnit = 0;
    priceSource = bnPricing.surDevis ? 'blocNoteSurDevis' : 'blocNoteIncomplete';
  } else if (plvPricing?.calculable) {
    prixUnit = plvPricing.prixUnitaire;
    priceSource = 'plvTarif';
    faceAlreadyInPrice = true;
  } else if (plvPricing?.surDevis) {
    prixUnit = 0;
    priceSource = 'plvSurDevis';
  } else if (livresPricing?.calculable) {
    prixUnit = livresPricing.prixUnitaire;
    priceSource = 'livresTarif';
    faceAlreadyInPrice = true;
  } else if (livresPricing && !livresPricing.calculable) {
    prixUnit = 0;
    priceSource = livresPricing.surDevis ? 'livresSurDevis' : 'livresIncomplete';
  } else if (calendarPricing?.calculable) {
    prixUnit = calendarPricing.prixUnitaire;
    priceSource = 'calendarTarif';
    faceAlreadyInPrice = true;
  } else if (calendarPricing && !calendarPricing.calculable) {
    prixUnit = 0;
    priceSource = calendarPricing.surDevis ? 'calendarSurDevis' : 'calendarIncomplete';
  }

  const dbTarifs = isProtectedPriceSource(priceSource)
    ? []
    : await safeDbTarifs(articleId);
  let appliedTier = null as ReturnType<typeof pickAppliedConfigTier>;

  if (!isProtectedPriceSource(priceSource) && dbTarifs.length) {
    const match = dbTarifs.find((t) => qty <= t.palier) || dbTarifs[dbTarifs.length - 1];
    prixUnit = match?.prixUnitaire ?? prixUnit;
    priceSource = 'dbTarif';
    if (match) {
      appliedTier = {
        source: 'db_tarif',
        label: `≤ ${match.palier}`,
        minQty: 1,
        maxQty: match.palier,
        unitPrice: match.prixUnitaire,
      };
    }
  } else if (!isProtectedPriceSource(priceSource) && productConfig?.priceTiers?.length) {
    appliedTier = pickAppliedConfigTier(productConfig.priceTiers, qty, prixUnit);
    prixUnit = appliedTier?.unitPrice ?? pickTierUnitPrice(productConfig.priceTiers, qty, prixUnit);
    priceSource = 'priceTiers';
  } else if (!isProtectedPriceSource(priceSource) && productConfig?.prixBase) {
    prixUnit = productConfig.prixBase;
    priceSource = 'prixBase';
  }

  const largCm = Number(config.largeur_cm) || 0;
  const hautCm = Number(config.hauteur_cm) || 0;
  let gfBillable: GrandFormatBillableResult | null = null;

  if (isGrandFormatArticleId(articleId)) {
    await Promise.all([
      loadGfAdminPricingToRuntime().catch(() => null),
      loadGfCuttingMarginsToRuntime().catch(() => null),
    ]);
    const profile = await loadGrandFormatStockProfile(articleId);
    const availableLaizesCm = profile
      ? resolveAvailableLaizesCm(profile, articleId)
      : [];
    const prixM2Base =
      profile?.prixA0
      ?? profile?.prixM2Fallback
      ?? productConfig?.prixM2
      ?? null;
    const plaqueThickness = resolvePlaqueThicknessPrixM2(articleId, config, prixM2Base);
    const prixM2Gf = plaqueThickness
      ? plaqueThickness.surDevis
        ? null
        : plaqueThickness.prixM2
      : prixM2Base;

    if (isBacheArticleId(articleId)) {
      // Règles bâche (canonique + legacy gf-mesh / gf-bache440…) : laize, œillets, sur-mesure
      const legacyPrefill = bacheLegacyPrefill(articleId) ?? {};
      const bacheConfig = { ...legacyPrefill, ...config };
      const bacheEv = evaluateBache(bacheConfig, { prixM2: prixM2Gf ?? undefined });
      gfBillable = bacheEvalToGfBillable(bacheEv, prixM2Gf);
      if (bacheEv.finalTotal != null && bacheEv.finalTotal > 0 && qty > 0) {
        prixUnit = Math.round(bacheEv.finalTotal / qty);
        priceSource = 'bacheEngine';
        faceAlreadyInPrice = true;
      } else {
        // Jamais coller sur prixDepart Excel « à partir de »
        prixUnit = 0;
        priceSource = 'gfSurDevis';
        faceAlreadyInPrice = true;
      }
    } else {
      // Vinyle / one-way / PVC / plexi… : laize, A0×ratio, marges découpe, surface perso
      const gfFull = calculateGrandFormatPrice({
        config,
        availableLaizesCm,
        prixM2: prixM2Gf,
        stockKind: profile?.stockKind ?? 'rouleau',
        quantite: qty,
        useA0FractionPricing: !isGrandFormatCustomFormat(config),
      });
      gfBillable = gfFull;

      if (gfFull.calculable && gfFull.prixUnitaireFinal > 0) {
        prixUnit = gfFull.prixUnitaireFinal;
        priceSource = isGrandFormatCustomFormat(config) ? 'gfLaizeSurface' : 'gfStandardA0';
        faceAlreadyInPrice = true;
      } else if (gfFull.surDevis) {
        prixUnit = 0;
        priceSource = 'gfSurDevis';
        faceAlreadyInPrice = true;
      } else if (prixM2Gf && prixM2Gf > 0) {
        // Config GF incomplète : ne pas inventer un PU naïf (prixM2 × m² sans laize/marges)
        prixUnit = 0;
        priceSource = 'gfSurDevis';
        faceAlreadyInPrice = true;
      }
    }

    // Filet de sécurité : aucun GF live ne doit rester sur forfait catalogue
    if (priceSource === 'prixDepart') {
      prixUnit = 0;
      priceSource = 'gfSurDevis';
      faceAlreadyInPrice = true;
    }
  } else if (
    !isProtectedPriceSource(priceSource)
    && productConfig?.prixM2
    && largCm > 0
    && hautCm > 0
  ) {
    // Surface × prixM2 uniquement si aucun moteur dédié (calendrier, event, livres…) n'a déjà fixé le PU
    const m2 = (largCm * hautCm) / 10000;
    prixUnit = Math.round(productConfig.prixM2 * m2);
    priceSource = 'legacySurfaceM2';
  } else if (
    !isProtectedPriceSource(priceSource)
    && productConfig?.prixM2
  ) {
    const gfM2 = computeGrandFormatM2(config);
    if (gfM2) {
      prixUnit = Math.round(productConfig.prixM2 * gfM2);
      priceSource = 'legacySurfaceM2';
    }
  }

  // Fallback prixCm2 packaging (autres pkg-* + anomalie pkg-boite hors moteur)
  if (
    productConfig?.prixCm2
    && priceSource !== 'packagingBoxIsfFinitions'
    && !isProtectedPriceSource(priceSource)
  ) {
    const box = resolvePackagingMaterialRecap(articleId, config);
    if (box) prixUnit = Math.round(productConfig.prixCm2 * box.surfaceCm2);
  }

  if (!isProtectedPriceSource(priceSource) && !isGrandFormatArticleId(articleId)) {
    const customSurface = computeCustomSurfacePrice(articleId, config, productConfig, qty);
    if (customSurface.calculable && customSurface.priceSource) {
      prixUnit = customSurface.prixUnitaire;
      priceSource = customSurface.priceSource;
      faceAlreadyInPrice = true;
    }
  }

  // Fallback grille Excel forfait pièce — uniquement legacy explicite, jamais en STRICT.
  if (
    isPrix2026LegacyEnabled()
    && !isStrictPosPricing()
    && (priceSource === 'prixDepart' || priceSource === 'plvSurDevis')
    && articleHasPrix2026Grid(articleId)
    && !isGrandFormatArticleId(articleId)
    && !isCarteriePricingArticle(articleId, article.category)
    && !isFlyerPricingArticle(articleId, article.category)
  ) {
    const excelFallback = await tryComputePrix2026GridPrice(articleId, config, options);
    if (excelFallback) return excelFallback;
  }

  const pricingCoeffs = await getPricingCoeffNumbers().catch(() => ({
    face_recto_verso_mult: DEFAULT_FACE_RECTO_VERSO_MULT,
    finition_surcharge_pct: DEFAULT_FINITION_SURCHARGE_PCT,
  }));

  const faceRaw = resolveConfigFace(config);
  if (
    isRectoVerso(faceRaw) &&
    !faceAlreadyInPrice &&
    !shouldSkipRectoVersoMultiplier(articleId, config)
  ) {
    prixUnit = Math.round(
      prixUnit * (pricingCoeffs.face_recto_verso_mult ?? DEFAULT_FACE_RECTO_VERSO_MULT),
    );
  }

  let finitionAdjustments: ReturnType<typeof applyFinitionArticlePricing>['adjustments'] | null = null;
  if (isStandaloneFinitionArticle(articleId)) {
    const fin = applyFinitionArticlePricing(articleId, prixUnit, config, qty);
    prixUnit = fin.prixUnitaire;
    finitionAdjustments = fin.adjustments;
    if (articleId === 'fin-reliure' && fin.adjustments.bindingUnitPrice != null) {
      priceSource = 'bindingCatalog';
    } else if (fin.adjustments.surfaceM2) {
      priceSource = 'finitionSurfaceM2';
    } else if (fin.adjustments.formatFactor !== 1 || fin.adjustments.faceCoefficient !== 1) {
      priceSource = 'finitionFormat';
    }
  }

  // Moteurs qui intègrent déjà les finitions (ISF / packaging / publications / event)
  prixUnit = shouldSkipGenericFinitionSurcharge(priceSource)
    ? prixUnit
    : applyFinitionSurcharge(
      prixUnit,
      config,
      articleId,
      pricingCoeffs.finition_surcharge_pct ?? DEFAULT_FINITION_SURCHARGE_PCT,
    );

  let pricingMode: PriceResult['pricingMode'] = 'auto';
  const forcedPu = options?.prixForce ?? resolveForcedUnitPrice(config);
  if (forcedPu > 0) {
    prixUnit = forcedPu;
    pricingMode = 'force_pu';
  }

  const clicheFee = Number(config.cliche) || 0;
  const isfArticle = isImpressionSfPricingArticle(articleId, article.category);
  const useIsfVolumeRemise =
    isfPricing?.calculable || (priceSource === 'basePrintingNoFinish' && isfArticle);

  const isFinitionArticle = isStandaloneFinitionArticle(articleId);
  const useFlyerRemise = priceSource === 'flyerIsfPliage' && flyerPricing?.calculable;
  const useCarterieRemise = priceSource === 'carterieIsfImposition' && carteriePricing?.calculable;

  const usePublicationRemise =
    (priceSource === 'livresTarif' && livresPricing?.publication?.calculable)
    || (priceSource === 'blocNoteTarif' && bnPricing?.publication?.calculable)
    || (priceSource === 'calendarTarif' && calendarPricing?.publication?.calculable);

  const publicationRemiseRate =
    livresPricing?.publication?.remiseRate
    ?? bnPricing?.publication?.remiseRate
    ?? calendarPricing?.publication?.remiseRate
    ?? 0;
  const publicationRemiseAmount =
    livresPricing?.publication?.remiseAmount
    ?? bnPricing?.publication?.remiseAmount
    ?? calendarPricing?.publication?.remiseAmount
    ?? 0;

  /** Paliers Admin (DiscountTier) — priorité sur remises volume globales pour le POS commercial. */
  let articleTierRemisePct = 0;
  try {
    const dbDiscountTiersAll = await prisma.discountTier.findMany({
      where: { articleId, active: true },
      orderBy: { minQty: 'asc' },
      select: {
        id: true,
        minQty: true,
        maxQty: true,
        unitPrice: true,
        discountPercent: true,
        active: true,
        variantKey: true,
      },
    });
    const variantKey = resolvePricingVariantKey(articleId, config as Record<string, unknown>);
    const dbDiscountTiers = pickDiscountTiersForVariant(dbDiscountTiersAll, variantKey);
    if (dbDiscountTiers.length && prixUnit > 0) {
      const hit = pickAppliedDbTier(dbDiscountTiers, qty, prixUnit);
      if (hit) {
        appliedTier = hit;
        const pct = Number(hit.discountPercent) || 0;
        if (pct > 0) {
          // Aligne POS « Unitaire » sur Admin (prix après remise %).
          prixUnit = Math.round(prixUnit * (1 - pct / 100));
          articleTierRemisePct = pct;
        } else if (
          hit.unitPrice > 0
          && dbDiscountTiers.some((t) => t.unitPrice != null)
          && !isGrandFormatArticleId(articleId)
          && !isProtectedPriceSource(priceSource)
        ) {
          prixUnit = hit.unitPrice;
          priceSource = 'articleDiscountTiers';
        }
      }
    }
  } catch {
    /* paliers article optionnels */
  }

  const remiseRate = isFinitionArticle
    ? 0
    : articleTierRemisePct > 0
      ? 0 // déjà intégré dans prixUnit
    : useFlyerRemise
      ? (flyerPricing?.remiseRate ?? 0)
    : useCarterieRemise
      ? (carteriePricing?.remiseRate ?? 0)
    : usePublicationRemise
      ? publicationRemiseRate
    : carnetPricing?.calculable
    ? carnetAutocopiantVolumeRemiseRate(qty)
    : bnPricing?.calculable
      ? blocNoteVolumeRemiseRate(qty)
      : useIsfVolumeRemise
        ? impressionSfVolumeRemiseRate(qty)
        : plvPricing?.calculable
          ? plvVolumeRemiseRate(qty)
          : priceSource === 'salePrice2026'
              ? 0
              : volumeRemiseRate(qty);

  const sousTotal = prixUnit * qty;
  const remiseAmount = isFinitionArticle
    ? 0
    : articleTierRemisePct > 0
      ? 0
    : useFlyerRemise
      ? (flyerPricing?.remiseAmount ?? 0)
    : useCarterieRemise
      ? (carteriePricing?.remiseAmount ?? 0)
    : usePublicationRemise
      ? publicationRemiseAmount
    : carnetPricing?.calculable
    ? Math.round(sousTotal * remiseRate)
    : bnPricing?.calculable
      ? Math.round(sousTotal * remiseRate)
      : useIsfVolumeRemise
        ? impressionSfVolumeRemiseAmount(sousTotal, qty)
        : plvPricing?.calculable
          ? Math.round(sousTotal * remiseRate)
          : priceSource === 'salePrice2026'
              ? 0
              : volumeRemiseAmount(sousTotal, qty);
  let totalHT = sousTotal - remiseAmount + clicheFee;

  if (options?.totalForce && options.totalForce > 0) {
    totalHT = options.totalForce;
    pricingMode = 'force_total';
  }

  if (
    isStrictPosPricing()
    && pricingMode === 'auto'
    && (priceSource === 'prixDepart' || priceSource === 'priceNotConfigured')
  ) {
    return {
      articleId,
      articleLabel: article.name,
      qty,
      prixUnitaire: 0,
      sousTotal: 0,
      remiseRate: 0,
      remiseAmount: 0,
      clicheFee: 0,
      totalHT: 0,
      totalTTC: 0,
      pricingMode: 'auto',
      formulaApplied: undefined,
      snapshot: {
        config: { ...config, qty },
        calculatedAt: new Date().toISOString(),
        priceSource: 'priceNotConfigured',
        priceNotConfigured: true,
        legacyPrixDepart: article.prixDepart ?? null,
        adminFixHref: `/administration/catalogue-pos?article=${encodeURIComponent(articleId)}`,
      },
    };
  }

  const globalCfg = await safeGlobalPricingConfig();
  const delai = String(config.delai || config.delaiProduction || config.delai_realisation || '');
  totalHT = applyProductionMultiplier(totalHT, delai, globalCfg);
  const fees = applyFixedFees(totalHT, {
    bat: String(config.bat || config.epreuve || ''),
    livraison: String(config.livraison || config.modeLivraison || ''),
  }, globalCfg);
  totalHT = fees.totalHT;

  const tvaRate = (globalCfg.tvaDefault ?? 20) / 100;
  const formula = await safePriceFormula(articleId);

  return {
    articleId,
    articleLabel: article.name,
    qty,
    prixUnitaire: prixUnit,
    sousTotal,
    remiseRate,
    remiseAmount,
    clicheFee,
    totalHT,
    totalTTC: Math.round(totalHT * (1 + tvaRate)),
    pricingMode,
    formulaApplied: formula?.expression
      ?? flyerPricing?.formula
      ?? carteriePricing?.formula
      ?? carnetPricing?.formula
      ?? stampPricing?.formula
      ?? photobookPricing?.formula
      ?? tiragePhotoPricing?.formula
      ?? cadrePhotoPricing?.formula
      ?? bnPricing?.formula
      ?? isfPricing?.formula
      ?? livresPricing?.formula
      ?? calendarPricing?.formula
      ?? packagingBoxPricing?.formula
      ?? paperBagPricing?.formula
      ?? doypackPricing?.formula
      ?? precutLabelPricing?.formula
      ?? customCupPricing?.formula
      ?? hangtagPricing?.formula,
    snapshot: {
      config: { ...config, qty, ...(gfBillable ? { _gfBillable: gfBillable } : {}) },
      calculatedAt: new Date().toISOString(),
      priceReason: options?.priceReason || null,
      priceSource,
      appliedTier,
      salePrice2026Id,
      basePrintingId,
      gfBillable,
      bnPricing,
      carnetPricing,
      stampPricing,
      photobookPricing,
      tiragePhotoPricing,
      cadrePhotoPricing,
      isfPricing,
      flyerPricing,
      flyerNote: flyerPricing ? flyerPriceSummaryNote(flyerPricing) : null,
      carteriePricing,
      carterieNote: carteriePricing ? carteriePriceSummaryNote(carteriePricing) : null,
      packagingBoxPricing,
      packagingBoxNote: packagingBoxPricing ? packagingBoxPriceSummaryNote(packagingBoxPricing) : null,
      packagingSnapshotV2: packagingBoxPricing?.calculable
        ? buildPackagingBoxPriceSnapshotV2(articleId, config, packagingBoxPricing)
        : null,
      paperBagPricing,
      paperBagNote: paperBagPricing ? paperBagPriceSummaryNote(paperBagPricing) : null,
      doypackPricing,
      doypackNote: doypackPricing ? doypackPriceSummaryNote(doypackPricing) : null,
      precutLabelPricing,
      precutLabelNote: precutLabelPricing ? precutLabelPriceSummaryNote(precutLabelPricing) : null,
      customCupPricing,
      customCupNote: customCupPricing ? customCupPriceSummaryNote(customCupPricing) : null,
      hangtagPricing,
      hangtagNote: hangtagPricing ? hangtagPriceSummaryNote(hangtagPricing) : null,
      livresNote: livresPricing ? livresPriceSummaryNote(livresPricing) : null,
      blocNoteNote: bnPricing ? blocNotePriceSummaryNote(bnPricing) : null,
      calendarNote: calendarPricing ? calendarPriceSummaryNote(calendarPricing) : null,
      livresPricing,
      calendarPricing,
      finitionAdjustments,
      finitionContext: isStandaloneFinitionArticle(articleId)
        ? finitionPricingContext(articleId, config)
        : null,
      globalFees: { batFee: fees.batFee, livraisonFee: fees.livraisonFee, tvaRate },
    },
  };
}

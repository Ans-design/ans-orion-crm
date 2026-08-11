'use client';

import { useState, useMemo, useCallback, useEffect, useRef, Suspense, type ReactNode } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Check, Minus, Plus, Info, ChevronDown,
} from 'lucide-react';
import { PosSummaryContent, type PosPriceCalc } from '@/components/pos/pos-summary-content';
import { ProductConfiguratorHeader } from '@/components/pos/product-configurator-header';
import { CustomFormatDimensionsPanel } from '@/components/pos/custom-format-dimensions-panel';
import { PosStepAssistant } from '@/components/pos/pos-step-assistant';
import { PosMobileSummary } from '@/components/pos/pos-mobile-summary';
import { PosFieldLabel } from '@/components/pos/pos-field-label';
import { PosFieldPriceImpactBadge } from '@/components/pos/pos-field-price-impact-badge';
import { OrionErrorBoundary } from '@/components/shared/orion-error-boundary';
import { CATALOGUE, CATEGORIES, CAT_LABELS, formatPrice } from '@/lib/data/catalogue';
import { DEFAULT_FISCAL } from '@/lib/fiscal-config';
import { htToTtcMga } from '@/lib/pricing/mga-round';
import type { CatalogueItem, Category } from '@/lib/data/catalogue';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import { loadProductConfig, type ProductConfig, type ConfigSection, type ConfigField } from '@/lib/data/config-types-loader';
import { addToCart, getCart, updateCartItem, trackRecentArticle } from '@/lib/cart-store';
import { usePosProductConfig } from '@/lib/hooks/use-pos-product-config';
import { usePosGfProfile } from '@/lib/hooks/use-pos-gf-profile';
import { usePosAdminChips } from '@/lib/hooks/use-pos-admin-chips';
import { usePosOptionOverrides } from '@/lib/hooks/use-pos-option-overrides';
import { usePosMaterialsCatalog } from '@/lib/hooks/use-pos-materials-catalog';
import { getClientSnapshotForCart } from '@/lib/sales-flow/sales-client-store';
import { PosClientRequired } from '@/components/sales-flow/pos-client-required';
import { SalesClientBanner } from '@/components/sales-flow/sales-client-banner';
import { PosContinueCartBanner } from '@/components/sales-flow/pos-continue-cart-banner';
import { DirectSalePolicyBanner } from '@/components/pos/direct-sale-policy-banner';
import { usePosOrderFlow } from '@/components/sales-flow/pos-order-flow-provider';
import { useSalesClient } from '@/lib/sales-flow/use-sales-client';
import { emitCommercialJourney } from '@/lib/commercial/commercial-journey-store';
import { usePosServerPrice } from '@/lib/hooks/use-pos-server-price';
import { resolvePackagingMaterialRecap } from '@/lib/packaging/material-recap';
import { surfaceM2FromFormatEqMm, surfaceToA4Equivalent } from '@/lib/packaging/packaging-a4-equivalence';
import { resolveCalendarMaterialRecap } from '@/lib/calendar/material-recap';
import { resolveBlocNoteMaterialRecap } from '@/lib/pos/bloc-note-material-recap';
import { resolvePlvMaterialRecap } from '@/lib/pos/plv-material-recap';
import { resolveLivresMaterialRecap } from '@/lib/pos/livres-material-recap';
import type { CalendarMaterialRecap } from '@/lib/calendar/material-recap';
import { resolveCustomSurfaceRecap } from '@/lib/pos/custom-surface-recap';
import { buildCalendarCalculationSnapshot } from '@/lib/calendar/calendar-snapshot';
import { buildPackagingCalculationSnapshot, buildPackagingBoxPriceSnapshotV2 } from '@/lib/packaging/packaging-snapshot';
import type { PackagingBoxPriceResult } from '@/lib/packaging/packaging-box-price';
import { buildCustomSurfaceSnapshotForArticle } from '@/lib/pos/surface-snapshot';
import { buildBindingCalculationSnapshot } from '@/lib/print/binding-snapshot';
import { computeGrandFormatDimensions } from '@/lib/pricing/format-dimensions';
import { isGrandFormatArticleId } from '@/lib/grand-format/article-meta';
import {
  availableLaizesCmFromProfile,
  gfLaizeAvailabilityMap,
  injectGfLaizeFallbacksIntoProductConfig,
  mergeGfProfileIntoProductConfig,
} from '@/lib/grand-format/pos-config';
import type { GrandFormatBillableResult } from '@/lib/grand-format/types';
import { pickTierUnitPrice, pickAppliedConfigTier } from '@/lib/pricing/tier-price';
import { buildPricingSnapshotEnvelope } from '@/lib/pricing/pricing-snapshot-meta';
import type { AppliedTierSnapshot } from '@/lib/pricing/tier-price';
import { volumeRemiseAmount, volumeRemiseRate } from '@/lib/pricing/volume-remise';
import { DEFAULT_FACE_RECTO_VERSO_MULT } from '@/lib/pricing/pricing-defaults';
import { articleUsesUnifiedServerPricing } from '@/lib/pos/server-pricing-policy';
import { isStrictPosPricing } from '@/lib/pos/pos-price-policy';
import {
  applyFinitionSurcharge,
  isRectoVerso,
  resolveConfigFace,
  resolveForcedUnitPrice,
  resolveConfigQty,
} from '@/lib/pricing/config-normalize';
import {
  applyFinitionArticlePricing,
  isStandaloneFinitionArticle,
  shouldSkipRectoVersoMultiplier,
} from '@/lib/finition/finition-pricing';
import { normalizePaperInConfig, resetPaperWeightIfNeeded } from '@/lib/data/paper-material';
import { grammageOptionsForConfig } from '@/lib/pos/material-weights';
import {
  grammageEmptyPlaceholder,
  grammageKeyForParent,
  isGrammageFieldKey,
  isGrammageParentKey,
  resolveGrammageOptions,
} from '@/lib/pos/grammage-field';
import {
  buildEmptyPosConfig,
  computePosCompletion,
  isPosConfigReady,
} from '@/lib/pos/initial-config';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';
import { applyProductOptionOverrides, getFieldOverride } from '@/lib/pos/apply-product-option-overrides';
import type { ProductOptionOverrides } from '@/lib/pos/product-option-overrides.types';
import { applyChipSelection, clearHiddenFieldValues, formatMultiSelectionProgress } from '@/lib/pos/chip-selection';
import { posChipClassName, POS_CHIP_SIZE } from '@/lib/pos/chip-ui';
import {
  applyCarteMaterialRules,
  filterCarteFaceOptions,
  filterCarteMatiereOptions,
  isCarteArticleId,
} from '@/lib/pos/carte-material-rules';
import {
  applyThickPaperGrammageRules,
  filterThickPaperGrammageOptions,
  getMinGrammageHint,
  isGrammageBelowMinimum,
} from '@/lib/pos/thick-paper-grammage-policy';
import {
  customFieldUiCopy,
  isCustomOptionValue,
  resolveCustomFieldKind,
  shouldShowDimensionInputs,
  shouldShowTypedCustomBlock,
} from '@/lib/pos/custom-field-ui';
import { shouldShowForcedPriceWarning } from '@/lib/pos/format-personnalise-policy';
import { syncBindingRecommendationInConfig } from '@/lib/pos/sync-binding-recommendation';
import { buildGeneratedFormatLabel } from '@/lib/pos/generated-format-label';
import {
  isCustomFormatChipField,
  isManagedCustomFormatDimensionField,
  shouldUseCustomFormatDimensionsPanel,
} from '@/lib/pos/custom-format-dimension-schema';
import {
  applyGlossyMaterialRules,
  filterGlossyGrammageOptions,
} from '@/lib/pos/glossy-grammage-policy';
import { parentFieldForGrammage } from '@/lib/pos/grammage-field';
import { resolveChipOptions } from '@/lib/pos/admin-chip-filter';
import {
  applyAutocopiantColorRules,
  isAutocopiantArticleId,
  patchAutocopiantCouleursField,
  resolveAutocopiantColorCount,
} from '@/lib/pos/autocopiant-policy';
import { AutocopiantSoucheColors } from '@/components/pos/autocopiant-souche-colors';
import type { ChipAdminEntry } from '@/lib/admin-config/types';
import { useCanViewMargin } from '@/hooks/use-can-view-margin';
import { uxToast, UX_MSG } from '@/lib/ux/feedback';
import { classifyFetchError } from '@/lib/ux/messages';
import type { StockCheckResult } from '@/lib/services/StockAvailabilityService';
import { posBackLabel, posCatalogHref, resolvePosBackCat, appendPosQueryParam } from '@/lib/pos/catalog-nav';
import { cn } from '@/lib/utils';
import {
  fieldGridSpanClass,
  isFieldVisible,
  resolveSectionLayout,
  sectionGridClass,
} from '@/lib/pos/section-layout';
import {
  isFieldValueComplete,
  isPosProgressField,
} from '@/lib/pos/initial-config';
import { formatPosFieldDisplay } from '@/lib/pos/field-display';
import {
  catalogLegacyPrefill,
  catalogLegacyRedirectParams,
  catalogLegacyRedirectTarget,
  resolveCatalogCanonicalId,
} from '@/lib/pos/catalog-resolver';
import { getOriflammeVoileDetail, getOriflammeVoileLabel } from '@/lib/data/oriflamme-catalog';
import {
  getPresentoirFormatChipSubtitle,
  getPresentoirFormatDetail,
} from '@/lib/data/plv-presentoir-catalog';
import {
  applyLivresConfigRules,
  filterLivresReliureOptions,
  isLivresArticleId,
  livresConfigRuleToast,
  livresSaddleStitchPagesHint,
  validateLivresConfig,
  validateLivresMixtePages,
} from '@/lib/pos/livres-binding-policy';
import {
  getBindingOptionHint,
  parsePagesFromConfig,
  printModeFromConfig,
} from '@/lib/data/binding-catalog';
import { CornerRoundingSelector } from '@/components/pos/corner-rounding-selector';
import { BindingTechnicalRecommendation } from '@/components/pos/binding-technical-recommendation';
import { BacheEyeletsSelector } from '@/components/pos/bache-eyelets-selector';
import { BacheFinishingsSelector } from '@/components/pos/bache-finishings-selector';
import { parseBacheFinishings } from '@/lib/grand-format/bache-finishings';
import {
  articleUsesBindingEngine,
  bindingValidationMessage,
  evaluateBinding,
  isMetalSpiralCompatible,
} from '@/lib/print/binding-rules';
import { isBacheArticleId } from '@/lib/pos/bache-catalog';
import { calculateGrandFormatPrice } from '@/lib/grand-format/calculate-grand-format-price';
import { isGrandFormatCustomFormat } from '@/lib/grand-format/pricing';
import { resolvePlaqueThicknessPrixM2 } from '@/lib/grand-format/plaque-thickness-pricing';
import { validateBacheConfig } from '@/lib/grand-format/bache-validation';
import { validateGfConfig } from '@/lib/grand-format/gf-validation';
import { evaluateBache, grammagesForBacheType, defaultGrammageForType, getBacheDimensionsM, getBacheDimensionsCm } from '@/lib/grand-format/bache-rules';
import { bacheEvalToGfBillable, bacheCartSnapshot } from '@/lib/grand-format/bache-bridge';
import {
  getBacheAvailableLaizesCm,
  cmToLaizeChipLabel,
  impressionAllowsRectoVerso,
} from '@/lib/print/grand-format-laize-rules';
import { parseBacheEyelets } from '@/lib/grand-format/bache-eyelets';
import { BINDING_LABELS } from '@/lib/data/binding-catalog';
import { normalizeFinitionConfig } from '@/lib/finition/finition-normalize';
import { validateFinitionConfig } from '@/lib/finition/finition-validation';
import {
  computeSurfaceM2,
  filterPelliculageProcedeOptions,
  filterPoseAutocollantTypeOptions,
  isPoseGrandFormat,
} from '@/lib/finition/finition-field-policy';
import { parseCornerRounding } from '@/lib/finition/corner-rounding';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import {
  dimensionFingerprint,
  resolveLaizeChipLabel,
} from '@/lib/pos/laize-auto-suggest';
import { sortPOSOptions } from '@/lib/pos/sort-pos-options';
import { sortGrammageChipOptions } from '@/lib/pos/grammage-chip-sort';
import { sortMatiereChipOptions } from '@/lib/pos/material-chip-sort';
import { displayFormatChipLabel } from '@/lib/pos/format-display';
import { dedupeFormatOptions, extractIsoFormatCode, formatIdentityKey } from '@/lib/pos/normalize-format-options';
import {
  applyImpressionSfMaterialRules,
  filterImpressionSfMatiereOptions,
  isImpressionSfArticleId,
  resolveImpressionSfGrammageOptions,
} from '@/lib/pos/impression-sf-policy';
import { isFormatAllowedForMaterial } from '@/lib/pricing/material-format-limits';
import { isGiftCardMaterialAllowed } from '@/lib/pricing/event-pricing';

const PACKAGING_ARTICLE_IDS = new Set([
  'pkg-hangtag', 'pkg-etiquette', 'pkg-boite', 'pkg-doypack', 'pkg-sac', 'pkg-gobelet',
]);
/** Articles dont les grammages viennent uniquement de config-types (pas le catalogue stock). */
const CONFIG_GRAMMAGE_ARTICLE_IDS = new Set([
  'cal-chevalet-table',
  'cal-chevalet',
  'cal-mural',
  'cal-marquepage',
  'cal-plateau',
  'cal-sousmain',
  'bn-bloc-note',
  'evt-affiche',
  'evt-pochette',
  'plv-rollup',
  'plv-xbanner',
  'imp-impression',
  'imp-offset',
  'imp-pcb',
  'imp-autocollant',
  'imp-pvc',
  'imp-sublimation',
  'imp-nb80',
  'imp-quadri',
  'imp-laser',
]);

function patchFlyerQtyMin(config: ProductConfig | null, format: string | undefined): ProductConfig | null {
  if (!config) return null;
  const minQty = getFlyerMinQty(format);
  return {
    ...config,
    qtyMin: minQty,
    sections: config.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) =>
        field.key === 'qty' ? { ...field, min: minQty } : field,
      ),
    })),
  };
}
import {
  applyFlyerMaterialRules,
  filterFlyerGrammageOptions,
  filterFlyerMatiereOptions,
  resolveFlyerGrammageOptions,
} from '@/lib/pos/flyer-material-policy';
import { getFlyerMinQty, isFlyerArticleId } from '@/lib/pos/flyer-catalog';
import { PosPriceConfigureBlock } from '@/components/pos/pos-price-configure-block';
import { PosPricePendingBanner } from '@/components/pos/pos-price-pending-banner';
import { usePosPriceGate } from '@/lib/hooks/use-pos-price-gate';
import type { PosCatalogueItem } from '@/lib/services/catalogue-pos-builder';
import { applyMaterialRuleVariables } from '@/lib/pos/runtime-material-rules';
import { applyPrintTechnologyRules, filterPrintTechnologyOptions, getPrintTechnologyCompatAlert } from '@/lib/pos/print-technology-compat';
import { filterRetiredMaterialOptions } from '@/lib/pos/retired-material-policy';
import { locatePosField, POS_LOCATE_FIELD } from '@/lib/pos/locate-pos-field';
import { PosLocatePathFrame } from '@/components/pos/pos-locate-path-frame';
import {
  filterCalendarGrammageOptions,
  filterCalendarMaterialOptions,
  isCalendarArticleId,
} from '@/lib/calendar/calendar-material-policy';
import {
  shouldInjectPrintMaterialCatalog,
} from '@/lib/pos/print-material-policy';
const SKIP_DYNAMIC_DIMENSION_ARTICLES = new Set([
  'pkg-etiquette', 'pkg-sac', 'pkg-doypack', 'pkg-boite',
]);

/** Réinitialise la technologie si incompatible (PCB/PCM vs jet d'encre, règles admin). */
function resetTechnologieIfNeeded(
  config: Record<string, unknown>,
  articleId?: string | null,
): Record<string, unknown> {
  return applyPrintTechnologyRules(config, articleId);
}

export default function ConfigurateurPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Chargement configurateur…</div>}>
      <OrionErrorBoundary zone="POS">
        <ConfigurateurPage />
      </OrionErrorBoundary>
    </Suspense>
  );
}

function ConfigurateurPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client: salesClient } = useSalesClient();
  const { requestClientChange, requestNewOrder } = usePosOrderFlow();
  const editCartId = searchParams.get('editCart');
  const commandeQueryId = searchParams.get('commande');
  const { info: commandeLinkInfo } = useCommandeDeepLink();
  const articleId = params?.id as string;
  const resolvedArticleId = resolveCatalogCanonicalId(articleId);
  const [apiArticle, setApiArticle] = useState<PosCatalogueItem | null>(null);
  const [apiArticleLoaded, setApiArticleLoaded] = useState(false);
  const [articleLoadError, setArticleLoadError] = useState<string | null>(null);
  const [articleNotFound, setArticleNotFound] = useState(false);
  const [quoteDraftLoading, setQuoteDraftLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setApiArticleLoaded(false);
    setArticleLoadError(null);
    setArticleNotFound(false);
    setApiArticle(null);
    fetch(`/api/pos/catalogue/${encodeURIComponent(articleId)}`, { credentials: 'include', cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 404) {
          if (!cancelled) setArticleNotFound(true);
          return;
        }
        if (!r.ok) throw new Error(classifyFetchError(r));
        const d = await r.json();
        if (!cancelled) {
          if (d?.item) setApiArticle(d.item as PosCatalogueItem);
          else setArticleNotFound(true);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setArticleLoadError(classifyFetchError(e));
      })
      .finally(() => {
        if (!cancelled) setApiArticleLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  const article = useMemo(
    () => apiArticle ?? findCatalogueItem(articleId) ?? CATALOGUE?.find((a: CatalogueItem) => a?.id === articleId),
    [apiArticle, articleId],
  );

  const priceGate = usePosPriceGate({
    articleId: resolvedArticleId,
    article,
    apiArticle,
    apiArticleLoaded,
    articleLoadError,
    articleNotFound,
  });
  const backCat = useMemo(
    () => resolvePosBackCat(searchParams.get('cat'), article?.category),
    [searchParams, article?.category],
  );
  const backHref = useMemo(
    () => appendPosQueryParam(posCatalogHref(backCat), 'commande', commandeQueryId),
    [backCat, commandeQueryId],
  );
  const backLabel = useMemo(() => posBackLabel(backCat), [backCat]);
  const catDef = useMemo(() => CATEGORIES?.find((c: Category) => c?.id === article?.category), [article]);
  const { productConfig, configSchemaLoading } = usePosProductConfig(
    resolvedArticleId,
    article?.configType,
  );
  const isBacheArticle = Boolean(resolvedArticleId && isBacheArticleId(resolvedArticleId));
  const isGfArticle = Boolean(resolvedArticleId && isGrandFormatArticleId(resolvedArticleId));
  const { gfProfile } = usePosGfProfile(resolvedArticleId, isGfArticle);

  const productConfigWithGfLaizes = useMemo(() => {
    if (!isGfArticle || !resolvedArticleId) return productConfig ?? null;
    return injectGfLaizeFallbacksIntoProductConfig(productConfig ?? null, resolvedArticleId);
  }, [isGfArticle, resolvedArticleId, productConfig]);

  const effectiveProductConfig = useMemo(
    () => mergeGfProfileIntoProductConfig(productConfigWithGfLaizes, gfProfile),
    [productConfigWithGfLaizes, gfProfile],
  );

  const gfLaizeAvailability = useMemo(
    () => gfLaizeAvailabilityMap(gfProfile, resolvedArticleId ?? undefined),
    [gfProfile, resolvedArticleId],
  );

  // Dynamic state: config vierge au chargement (prefill legacy si URL ancienne)
  const [config, setConfig] = useState<Record<string, any>>(() => {
    const base = buildEmptyPosConfig(productConfig);
    const prefill = catalogLegacyPrefill(articleId);
    if (prefill) {
      for (const [key, val] of Object.entries(prefill)) {
        base[key] = val;
      }
    }
    for (const key of ['format', 'produit', 'type', 'matiere'] as const) {
      const urlVal = searchParams.get(key);
      if (urlVal) base[key] = urlVal;
    }
    return base;
  });

  useEffect(() => {
    if (!productConfig || cartHydratedRef.current || editCartId) return;
    const base = buildEmptyPosConfig(productConfig);
    const prefill = catalogLegacyPrefill(articleId);
    if (prefill) {
      for (const [key, val] of Object.entries(prefill)) {
        base[key] = val;
      }
    }
    for (const key of ['format', 'produit', 'type', 'matiere'] as const) {
      const urlVal = searchParams.get(key);
      if (urlVal) base[key] = urlVal;
    }
    setConfig(base);
  }, [productConfig, articleId, editCartId, searchParams]);

  const optionOverrides = usePosOptionOverrides(resolvedArticleId);
  const { materialWeights, printMaterialOptions } = usePosMaterialsCatalog();

  const displayProductConfig = useMemo(() => {
    const base = effectiveProductConfig ?? productConfig ?? null;
    const patched =
      !base || !isFlyerArticleId(resolvedArticleId, article?.category)
        ? base
        : patchFlyerQtyMin(base, config.format);
    const filtered = filterProductConfigForPos(patched, {
      articleId: resolvedArticleId,
      category: article?.category,
    });
    return applyProductOptionOverrides(filtered, optionOverrides);
  }, [effectiveProductConfig, productConfig, resolvedArticleId, article?.category, config.format, optionOverrides]);

  const adminChips = usePosAdminChips(resolvedArticleId);
  const cartHydratedRef = useRef(false);
  const showMargin = useCanViewMargin();

  useEffect(() => {
    if (articleId === 'imp-conception' || articleId?.startsWith('cg-')) {
      const service =
        articleId.startsWith('cg-') && articleId !== 'cg-hub'
          ? articleId.replace(/^cg-/, '')
          : searchParams.get('service');
      const p = new URLSearchParams();
      if (service) p.set('service', service);
      if (editCartId) p.set('editCart', editCartId);
      const qs = p.toString();
      router.replace(`/pos/conception${qs ? `?${qs}` : ''}`);
    }
  }, [articleId, router, searchParams, editCartId]);

  useEffect(() => {
    if (!editCartId || !displayProductConfig || cartHydratedRef.current) return;
    const line = getCart().find((c) => c.id === editCartId);
    if (!line) return;
    if (resolveCatalogCanonicalId(line.articleId) !== resolvedArticleId) return;
    setConfig({
      ...buildEmptyPosConfig(displayProductConfig),
      ...(line.config as Record<string, unknown>),
    });
    cartHydratedRef.current = true;
  }, [editCartId, resolvedArticleId, displayProductConfig]);

  useEffect(() => {
    const target = catalogLegacyRedirectTarget(articleId);
    if (!target || target === articleId) return;
    const params = catalogLegacyRedirectParams(articleId, searchParams);
    router.replace(`/pos/${target}?${params.toString()}`, { scroll: false });
  }, [articleId, router, searchParams]);

  useEffect(() => {
    fetch('/api/admin-config/effective')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.variables) applyMaterialRuleVariables(d.variables);
      })
      .catch(() => { console.warn('[pos/id] fetch secondary failed'); });
  }, []);

  useEffect(() => {
    if (!resolvedArticleId) return;
    trackRecentArticle(resolvedArticleId);
  }, [resolvedArticleId]);

  useEffect(() => {
    if (!resolvedArticleId?.startsWith('fin-')) return;
    setConfig((prev) => normalizeFinitionConfig(resolvedArticleId, prev));
  }, [resolvedArticleId]);

  const updateConfig = useCallback((key: string, value: any) => {
    setConfig((prev) => {
      let next = { ...prev, [key]: value };
      if (key.startsWith('paperType') || isGrammageParentKey(key)) {
        next = resetPaperWeightIfNeeded(next, key, materialWeights);
        next = resetTechnologieIfNeeded(next, resolvedArticleId);
      }
      if (resolvedArticleId?.startsWith('fin-')) {
        next = normalizeFinitionConfig(resolvedArticleId, next);
      }
      if (resolvedArticleId && isBacheArticleId(resolvedArticleId) && key === 'dos') {
        if (
          !impressionAllowsRectoVerso(String(value)) &&
          String(next.face ?? '').toLowerCase().includes('verso')
        ) {
          next.face = 'Recto seul';
          queueMicrotask(() =>
            uxToast.info(
              'L\'impression a été repassée en Recto seul car le recto-verso est réservé au dos blanc.',
            ),
          );
        }
      }
      next = clearHiddenFieldValues(next, effectiveProductConfig ?? productConfig);
      if (
        (key === 'duplicopie' || key === 'nb_copies')
        && isAutocopiantArticleId(resolvedArticleId)
      ) {
        next = applyAutocopiantColorRules(next);
      }
      next = applyImpressionSfMaterialRules(
        resolvedArticleId ?? '',
        next,
        article?.category,
      );
      if (resolvedArticleId) {
        next = syncBindingRecommendationInConfig(resolvedArticleId, next);
      }
      if (isLivresArticleId(resolvedArticleId ?? '')) {
        const beforeLivres = { ...prev, [key]: value };
        next = applyLivresConfigRules(resolvedArticleId ?? '', next, key);
        const toastMsg = livresConfigRuleToast(beforeLivres, next, key);
        if (toastMsg) {
          queueMicrotask(() => uxToast.info(toastMsg));
        }
      }
      return next;
    });
  }, [materialWeights, productConfig, effectiveProductConfig, resolvedArticleId, article?.category]);

  const handleChipSelect = useCallback((field: ConfigField, optionLabel: string) => {
    setConfig((prev) => {
      const effectiveField =
        field.key === 'couleurs_souches' && isAutocopiantArticleId(resolvedArticleId ?? article?.id)
          ? patchAutocopiantCouleursField(field, prev)
          : field;
      let next = applyChipSelection(prev, effectiveField, optionLabel, productConfig);
      if (field.key.startsWith('paperType') || isGrammageParentKey(field.key)) {
        next = resetPaperWeightIfNeeded(next, field.key, materialWeights);
        next = resetTechnologieIfNeeded(next, resolvedArticleId);
      }
      if (field.key === 'type') {
        const cfg = effectiveProductConfig ?? productConfig;
        cfg?.sections.flatMap((s) => s.fields).forEach((f) => {
          if (f.optionsFilter?.field === 'type') {
            next[f.key] = '';
          }
        });
      }
      if (field.key === 'duplicopie' && isAutocopiantArticleId(resolvedArticleId ?? article?.id)) {
        next = applyAutocopiantColorRules(next);
      }
      const grammageKey = grammageKeyForParent(field.key);
      if (grammageKey) {
        next[grammageKey] = '';
      }
      next = clearHiddenFieldValues(next, effectiveProductConfig ?? productConfig);
      next = applyCarteMaterialRules(resolvedArticleId ?? article?.id ?? '', next);
      next = applyFlyerMaterialRules(
        resolvedArticleId ?? article?.id ?? '',
        next,
        article?.category,
      );
      next = applyThickPaperGrammageRules(
        resolvedArticleId ?? article?.id ?? '',
        next,
        article?.category,
      );
      next = applyImpressionSfMaterialRules(
        resolvedArticleId ?? article?.id ?? '',
        next,
        article?.category,
      );
      next = applyGlossyMaterialRules(next);
      if (resolvedArticleId) {
        next = syncBindingRecommendationInConfig(resolvedArticleId, next);
      }
      if (isLivresArticleId(resolvedArticleId ?? article?.id ?? '')) {
        const beforeLivres = { ...prev };
        beforeLivres[field.key] = optionLabel;
        next = applyLivresConfigRules(resolvedArticleId ?? article?.id ?? '', next, field.key);
        const toastMsg = livresConfigRuleToast(beforeLivres, next, field.key);
        if (toastMsg) {
          queueMicrotask(() => uxToast.info(toastMsg));
        }
      }
      if (resolvedArticleId === 'fin-pelliculage' && field.key === 'type' && optionLabel === 'Mat') {
        next.sous_type = 'Pelliculage à chaud';
      }
      if (resolvedArticleId?.startsWith('fin-')) {
        next = normalizeFinitionConfig(resolvedArticleId ?? '', next);
      }
      if (resolvedArticleId && isBacheArticleId(resolvedArticleId) && field.key === 'type_bache') {
        const def = defaultGrammageForType(optionLabel);
        if (def) next.grammage = def;
      }
      return next;
    });
  }, [materialWeights, productConfig, effectiveProductConfig, resolvedArticleId, article?.id, article?.category]);

  const [stockInfo, setStockInfo] = useState<StockCheckResult | null>(null);

  useEffect(() => {
    if (!resolvedArticleId) return;
    const rawQty = config.quantite ?? config.qty;
    const hasQty = rawQty !== '' && rawQty !== undefined && rawQty !== null;
    const qty = hasQty ? Number(rawQty) || 0 : 0;
    if (qty <= 0) {
      setStockInfo(null);
      return;
    }
    const timer = setTimeout(() => {
      fetch('/api/stock/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: resolvedArticleId, quantity: qty, configuration: config }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setStockInfo(d))
        .catch(() => setStockInfo({
          status: 'UNKNOWN',
          canAddToCart: true,
          canCreateQuote: true,
          canCreateOrder: true,
          requiresManagerApproval: false,
          message: 'Vérification stock temporairement indisponible',
        }));
    }, 450);
    return () => clearTimeout(timer);
  }, [resolvedArticleId, config]);

  const completion = useMemo(
    () => computePosCompletion(displayProductConfig ?? effectiveProductConfig ?? productConfig, config),
    [displayProductConfig, effectiveProductConfig, productConfig, config],
  );

  const isReady = useMemo(() => {
    const progressReady = isPosConfigReady(displayProductConfig ?? effectiveProductConfig ?? productConfig, config);
    if (!progressReady) return false;
    if (isBacheArticle) return validateBacheConfig(config) === null;
    if (isGfArticle && resolvedArticleId) return validateGfConfig(resolvedArticleId, config) === null;
    if (isLivresArticleId(resolvedArticleId ?? '')) return validateLivresConfig(config) === null;
    return true;
  }, [displayProductConfig, effectiveProductConfig, productConfig, config, isBacheArticle, isGfArticle, resolvedArticleId]);

  const bacheConfigError = useMemo(() => {
    if (!isBacheArticle) return null;
    return validateBacheConfig(config);
  }, [isBacheArticle, config]);

  const gfConfigError = useMemo(() => {
    if (!isGfArticle || isBacheArticle || !resolvedArticleId) return null;
    return validateGfConfig(resolvedArticleId, config);
  }, [isGfArticle, isBacheArticle, resolvedArticleId, config]);

  // Surface packaging (boîtes, doypack carton…)
  const boxSurface = useMemo(() => {
    if (!resolvedArticleId) return null;
    return resolvePackagingMaterialRecap(resolvedArticleId, config);
  }, [config, resolvedArticleId]);

  const calendarRecap = useMemo((): CalendarMaterialRecap | null => {
    if (!resolvedArticleId) return null;
    return resolveCalendarMaterialRecap(resolvedArticleId, config);
  }, [config, resolvedArticleId]);

  const blocNoteRecap = useMemo(() => {
    if (!resolvedArticleId) return null;
    return resolveBlocNoteMaterialRecap(resolvedArticleId, config);
  }, [config, resolvedArticleId]);

  const plvRecap = useMemo(() => {
    if (!resolvedArticleId) return null;
    return resolvePlvMaterialRecap(resolvedArticleId, config);
  }, [config, resolvedArticleId]);

  const livresRecap = useMemo(() => {
    if (!resolvedArticleId) return null;
    return resolveLivresMaterialRecap(resolvedArticleId, config);
  }, [config, resolvedArticleId]);

  const customSurfaceRecap = useMemo(() => {
    if (!resolvedArticleId || boxSurface || calendarRecap || blocNoteRecap || plvRecap || livresRecap) return null;
    const qty = parseInt(String(config.quantite ?? config.qty ?? 1), 10) || 1;
    return resolveCustomSurfaceRecap(resolvedArticleId, config, qty);
  }, [config, resolvedArticleId, boxSurface, calendarRecap, blocNoteRecap, plvRecap, livresRecap]);

  // Grand format m² — source unique format-dimensions
  const grandFormatM2 = useMemo(() => {
    const isGF = article?.category === 'grand_format' || article?.id?.startsWith('gf-');
    if (!isGF) return null;
    return computeGrandFormatDimensions(config);
  }, [config, article]);

  const bacheEval = useMemo(() => {
    if (!isBacheArticle) return null;
    const prixM2 = gfProfile?.prixA0 ?? gfProfile?.prixM2 ?? effectiveProductConfig?.prixM2 ?? null;
    return evaluateBache(config, { prixM2 });
  }, [config, isBacheArticle, gfProfile, effectiveProductConfig?.prixM2]);

  const bacheGfBillable = useMemo(() => {
    if (!bacheEval) return null;
    const prixM2 = gfProfile?.prixA0 ?? gfProfile?.prixM2 ?? effectiveProductConfig?.prixM2 ?? null;
    return bacheEvalToGfBillable(bacheEval, prixM2);
  }, [bacheEval, gfProfile, effectiveProductConfig?.prixM2]);

  const gfBillable = useMemo((): GrandFormatBillableResult | null => {
    if (!isGfArticle || !gfProfile || isBacheArticle) return bacheGfBillable;
    const prixM2Base = gfProfile.prixA0 ?? gfProfile.prixM2 ?? effectiveProductConfig?.prixM2 ?? null;
    const plaque = resolvedArticleId
      ? resolvePlaqueThicknessPrixM2(resolvedArticleId, config, prixM2Base)
      : null;
    const prixM2 = plaque ? (plaque.surDevis ? null : plaque.prixM2) : prixM2Base;
    const qty = Math.max(1, Number(config.qty) || 1);
    const bill = calculateGrandFormatPrice({
      config,
      availableLaizesCm: availableLaizesCmFromProfile(gfProfile, resolvedArticleId ?? undefined),
      prixM2,
      stockKind: gfProfile.stockKind,
      quantite: qty,
      useA0FractionPricing: !isGrandFormatCustomFormat(config),
    });
    if (plaque?.surDevis && plaque.reason) {
      return { ...bill, surDevis: true, calculable: false, prixUnitaire: 0, warning: plaque.reason };
    }
    if (plaque?.tierLabel && bill.calculable) {
      return {
        ...bill,
        ruleMessage: [bill.ruleMessage, `Tarif ${plaque.tierLabel}`].filter(Boolean).join(' · '),
      };
    }
    return bill;
  }, [config, gfProfile, isGfArticle, isBacheArticle, bacheGfBillable, effectiveProductConfig?.prixM2, resolvedArticleId]);

  const stockBlocked =
    stockInfo != null &&
    stockInfo.canAddToCart === false &&
    config.stock_override !== true;
  const canAddToCartBase = isReady && !stockBlocked;

  const laizeDimFingerprintRef = useRef('');
  const laizeFieldKey = useMemo(() => {
    const fields = effectiveProductConfig?.sections.flatMap((s) => s.fields) ?? [];
    if (fields.some((f) => f.key === 'laize_plaque')) return 'laize_plaque';
    return 'laize';
  }, [effectiveProductConfig]);

  useEffect(() => {
    if (!isGfArticle && !isBacheArticle) return;
    // Formats ISO A0–A5 : pas d’auto-suggestion laize.
    if (!isGrandFormatCustomFormat(config)) return;

    const fp = dimensionFingerprint(config);
    const laizeEmpty =
      !String(config.laize ?? '').trim() &&
      !String(config.laize_plaque ?? '').trim() &&
      !(parseFloat(String(config.laize_autre ?? config.laize_plaque_autre ?? '')) > 0);

    if (!laizeEmpty) {
      laizeDimFingerprintRef.current = fp;
      return;
    }

    if (fp === laizeDimFingerprintRef.current) return;

    const dims = computeGrandFormatDimensions(config);
    if (!dims) return;

    let recommendedCm: number | null = null;
    let recommendedLabel: string | null = null;

    if (isBacheArticle && bacheEval?.recommendedLaize) {
      recommendedLabel = bacheEval.recommendedLaize;
    } else if (gfBillable?.laizeUtiliseeCm) {
      recommendedCm = gfBillable.laizeUtiliseeCm;
    }

    const laizeField = effectiveProductConfig?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'laize' || f.key === 'laize_plaque');
    const availableLabels = laizeField?.options ?? gfProfile?.laizeChipLabels ?? [];

    const chipLabel =
      recommendedLabel ??
      (recommendedCm != null ? resolveLaizeChipLabel(recommendedCm, availableLabels) : null);

    if (!chipLabel) return;

    laizeDimFingerprintRef.current = fp;
    setConfig((prev) => {
      if (String(prev[laizeFieldKey] ?? '').trim()) return prev;
      return { ...prev, [laizeFieldKey]: chipLabel };
    });
  }, [
    config,
    isGfArticle,
    isBacheArticle,
    bacheEval,
    gfBillable,
    effectiveProductConfig,
    gfProfile,
    laizeFieldKey,
  ]);

  // Textile total qty from size table
  const textileQty = useMemo(() => {
    if (config.tailles && typeof config.tailles === 'object' && !Array.isArray(config.tailles)) {
      return Object.values(config.tailles as Record<string, number>).reduce((s: number, q: number) => s + (q || 0), 0);
    }
    return 0;
  }, [config.tailles]);

  const { price: serverPrice, loading: serverPriceLoading, error: serverPriceError } = usePosServerPrice({
    articleId: resolvedArticleId,
    config,
    textileQty,
    isReady,
  });

  const resolvePriceCalcMeta = useCallback(
    (qty: number): {
      appliedTier: PosPriceCalc['appliedTier'];
      formulaVersion: PosPriceCalc['formulaVersion'];
      pricingNote: PosPriceCalc['pricingNote'];
      flyerBreakdown: PosPriceCalc['flyerBreakdown'];
      carterieBreakdown: PosPriceCalc['carterieBreakdown'];
      publicationBreakdown: PosPriceCalc['publicationBreakdown'];
      packagingBreakdown: PosPriceCalc['packagingBreakdown'];
    } => {
      const snap = serverPrice?.snapshot as Record<string, unknown> | undefined;
      let pricingNote: string | null = null;
      let flyerBreakdown: PosPriceCalc['flyerBreakdown'] = null;
      let carterieBreakdown: PosPriceCalc['carterieBreakdown'] = null;
      let publicationBreakdown: PosPriceCalc['publicationBreakdown'] = null;
      let packagingBreakdown: PosPriceCalc['packagingBreakdown'] = null;
      if (snap && typeof snap === 'object') {
        const stamp = snap.stampPricing as { message?: string; formatUsed?: string } | undefined;
        const photo = snap.photobookPricing as {
          breakdown?: { formatUsed?: string; prixPage?: number; pages?: number; coverSupplement?: number };
        } | undefined;
        const tirage = snap.tiragePhotoPricing as {
          message?: string;
          breakdown?: { formatUsed?: string; prixUnitaire?: number; prixBaseA4?: number };
        } | undefined;
        const cadre = snap.cadrePhotoPricing as {
          message?: string;
          breakdown?: {
            formatBilled?: string;
            prixCadreVierge?: number;
            prixTiragePhoto?: number;
            tirageFormat?: string;
            prixUnitaire?: number;
          };
        } | undefined;
        const flyerNote = typeof snap.flyerNote === 'string' ? snap.flyerNote : null;
        const carterieNote = typeof snap.carterieNote === 'string' ? snap.carterieNote : null;
        const packagingBoxNote = typeof snap.packagingBoxNote === 'string' ? snap.packagingBoxNote : null;
        const paperBagNote = typeof snap.paperBagNote === 'string' ? snap.paperBagNote : null;
        const doypackNote = typeof snap.doypackNote === 'string' ? snap.doypackNote : null;
        const precutLabelNote = typeof snap.precutLabelNote === 'string' ? snap.precutLabelNote : null;
        const customCupNote = typeof snap.customCupNote === 'string' ? snap.customCupNote : null;
        const hangtagNote = typeof snap.hangtagNote === 'string' ? snap.hangtagNote : null;
        const livresNote = typeof snap.livresNote === 'string' ? snap.livresNote : null;
        const blocNoteNote = typeof snap.blocNoteNote === 'string' ? snap.blocNoteNote : null;
        const calendarNote = typeof snap.calendarNote === 'string' ? snap.calendarNote : null;
        const flyerPricing = snap.flyerPricing as {
          calculable?: boolean;
          missingField?: string;
          prixImpressionUnitaire?: number;
          prixPliageUnitaire?: number;
          nombrePlis?: number;
        } | undefined;
        const carteriePricing = snap.carteriePricing as {
          calculable?: boolean;
          missingField?: string;
          pricingMode?: 'excel_grid' | 'isf_imposition';
          gridColumnLabel?: string | null;
          gridTierLabel?: string | null;
          prixImpressionFeuille?: number;
          prixFinitionsFeuille?: number;
          piecesParFeuille?: number;
          prixParPieceAvantDecoupe?: number;
          prixDecoupeParPiece?: number;
          finitionsDetail?: Array<{ label: string; amount: number }>;
        } | undefined;
        const packagingBoxPricing = snap.packagingBoxPricing as {
          calculable?: boolean;
          reason?: string;
          formatEquivalent?: string;
          equivA4?: number;
          surfaceTheoriqueM2?: number;
          surfaceAvecDechetsM2?: number;
          margeDechetsPct?: number;
          prixImpressionBrut?: number;
          prixDechetsMatiere?: number;
          prixImpressionAvecDechets?: number;
          finitionLines?: Array<{ label: string; amount: number }>;
          prixFinitions?: number;
          prixFaconnage?: number;
          sousTotalDepenses?: number;
          beneficePct?: number;
          benefice?: number;
          margeDepensePct?: number;
          margeDepense?: number;
        } | undefined;
        if (flyerPricing?.calculable) {
          flyerBreakdown = {
            prixImpressionUnitaire: flyerPricing.prixImpressionUnitaire ?? 0,
            prixPliageUnitaire: flyerPricing.prixPliageUnitaire ?? 0,
            nombrePlis: flyerPricing.nombrePlis ?? 0,
          };
        }
        if (carteriePricing?.calculable) {
          carterieBreakdown = {
            pricingMode: carteriePricing.pricingMode,
            gridColumnLabel: carteriePricing.gridColumnLabel ?? null,
            gridTierLabel: carteriePricing.gridTierLabel ?? null,
            prixImpressionFeuille: carteriePricing.prixImpressionFeuille ?? 0,
            prixFinitionsFeuille: carteriePricing.prixFinitionsFeuille ?? 0,
            piecesParFeuille: carteriePricing.piecesParFeuille ?? 0,
            prixParPieceAvantDecoupe: carteriePricing.prixParPieceAvantDecoupe ?? 0,
            prixDecoupeParPiece: carteriePricing.prixDecoupeParPiece ?? 0,
            finitionsDetail: carteriePricing.finitionsDetail,
          };
        }
        if (packagingBoxPricing?.calculable) {
          packagingBreakdown = {
            formatEquivalent: packagingBoxPricing.formatEquivalent ?? '—',
            equivA4: packagingBoxPricing.equivA4 ?? 0,
            surfaceTheoriqueM2: packagingBoxPricing.surfaceTheoriqueM2 ?? 0,
            surfaceAvecDechetsM2: packagingBoxPricing.surfaceAvecDechetsM2 ?? 0,
            margeDechetsPct: packagingBoxPricing.margeDechetsPct ?? 0,
            prixImpressionBrut: packagingBoxPricing.prixImpressionBrut ?? 0,
            prixDechetsMatiere: packagingBoxPricing.prixDechetsMatiere ?? 0,
            prixImpressionAvecDechets: packagingBoxPricing.prixImpressionAvecDechets ?? 0,
            finitionLines: (packagingBoxPricing.finitionLines ?? []).map((f) => ({
              label: f.label,
              amount: f.amount,
            })),
            prixFinitions: packagingBoxPricing.prixFinitions ?? 0,
            prixFaconnage: packagingBoxPricing.prixFaconnage ?? 0,
            sousTotalDepenses: packagingBoxPricing.sousTotalDepenses ?? 0,
            beneficePct: packagingBoxPricing.beneficePct ?? 0,
            benefice: packagingBoxPricing.benefice ?? 0,
            margeDepensePct: packagingBoxPricing.margeDepensePct ?? 0,
            margeDepense: packagingBoxPricing.margeDepense ?? 0,
          };
        }
        const livresPricing = snap.livresPricing as {
          calculable?: boolean;
          publication?: {
            prixInterieur?: number;
            prixCouverture?: number;
            prixReliure?: number;
            prixFinitions?: number;
            pages?: number;
            feuillesPhysiques?: number;
            nombreCouverture?: number;
            reliureLabel?: string;
          };
        } | undefined;
        const bnPricingSnap = snap.bnPricing as {
          calculable?: boolean;
          publication?: {
            prixInterieur?: number;
            prixCouverture?: number;
            prixReliure?: number;
            prixFinitions?: number;
            pages?: number;
            feuillesPhysiques?: number;
            nombreCouverture?: number;
            reliureLabel?: string;
          };
        } | undefined;
        const calendarPricingSnap = snap.calendarPricing as {
          calculable?: boolean;
          publication?: {
            prixInterieur?: number;
            prixCouverture?: number;
            prixReliure?: number;
            prixFinitions?: number;
            pages?: number;
            feuillesPhysiques?: number;
            nombreCouverture?: number;
            reliureLabel?: string;
          };
        } | undefined;
        const pub =
          (livresPricing?.calculable && livresPricing.publication)
          || (bnPricingSnap?.calculable && bnPricingSnap.publication)
          || (calendarPricingSnap?.calculable && calendarPricingSnap.publication)
          || null;
        if (pub) {
          publicationBreakdown = {
            prixInterieur: pub.prixInterieur ?? 0,
            prixCouverture: pub.prixCouverture ?? 0,
            prixReliure: pub.prixReliure ?? 0,
            prixFinitions: pub.prixFinitions ?? 0,
            pages: pub.pages ?? 0,
            feuillesPhysiques: pub.feuillesPhysiques ?? 0,
            nombreCouverture: pub.nombreCouverture ?? 0,
            reliureLabel: pub.reliureLabel,
          };
        }
        if (stamp?.message) pricingNote = stamp.message;
        else if (livresNote) pricingNote = livresNote;
        else if (blocNoteNote) pricingNote = blocNoteNote;
        else if (calendarNote) pricingNote = calendarNote;
        else if (packagingBoxNote) pricingNote = packagingBoxNote;
        else if (paperBagNote) pricingNote = paperBagNote;
        else if (doypackNote) pricingNote = doypackNote;
        else if (precutLabelNote) pricingNote = precutLabelNote;
        else if (customCupNote) pricingNote = customCupNote;
        else if (hangtagNote) pricingNote = hangtagNote;
        else if (packagingBoxPricing && !packagingBoxPricing.calculable && packagingBoxPricing.reason) {
          pricingNote = `Prix en attente — ${packagingBoxPricing.reason}`;
        }
        else if (carterieNote) pricingNote = carterieNote;
        else if (carteriePricing && !carteriePricing.calculable && carteriePricing.missingField) {
          pricingNote =
            carteriePricing.missingField === 'pieces_par_feuille'
              ? 'Prix en attente — Capacité à définir (pièces / feuille)'
              : `Prix en attente — champ manquant : ${carteriePricing.missingField}`;
        }
        else if (flyerNote) pricingNote = flyerNote;
        else if (flyerPricing && !flyerPricing.calculable && flyerPricing.missingField) {
          pricingNote = `Prix en attente — champ manquant : ${flyerPricing.missingField}`;
        }
        else if (cadre?.breakdown) {
          const b = cadre.breakdown;
          pricingNote = [
            cadre.message,
            b.prixCadreVierge != null ? `Cadre vierge : ${formatPrice(b.prixCadreVierge)} Ar` : null,
            b.prixTiragePhoto != null
              ? `Tirage ${b.tirageFormat ?? b.formatBilled ?? ''} : ${formatPrice(b.prixTiragePhoto)} Ar`
              : null,
          ]
            .filter(Boolean)
            .join(' · ');
        }
        else if (tirage?.message) pricingNote = tirage.message;
        else if (tirage?.breakdown?.formatUsed) {
          pricingNote = `Format facturé : ${tirage.breakdown.formatUsed}`;
        }
        else if (photo?.breakdown) {
          const b = photo.breakdown;
          pricingNote = [
            b.formatUsed ? `Format facturé : ${b.formatUsed}` : null,
            b.prixPage != null ? `${formatPrice(b.prixPage)} Ar/page` : null,
            b.pages != null ? `${b.pages} pages` : null,
            b.coverSupplement != null && b.coverSupplement > 0
              ? `+${formatPrice(b.coverSupplement)} Ar couverture`
              : null,
          ]
            .filter(Boolean)
            .join(' · ');
        }
        const tier = (snap.appliedTier ?? (snap.pipeline as Record<string, unknown> | undefined)?.appliedTier) as
          | AppliedTierSnapshot
          | null
          | undefined;
        const formulaVersion =
          (typeof snap.formulaVersion === 'number' || typeof snap.formulaVersion === 'string')
            ? snap.formulaVersion
            : null;
        if (tier) {
          return {
            appliedTier: { label: tier.label, unitPrice: tier.unitPrice, source: tier.source },
            formulaVersion,
            pricingNote,
            flyerBreakdown,
            carterieBreakdown,
            publicationBreakdown,
            packagingBreakdown,
          };
        }
        if (
          formulaVersion != null
          || pricingNote
          || flyerBreakdown
          || carterieBreakdown
          || publicationBreakdown
          || packagingBreakdown
        ) {
          return {
            appliedTier: null,
            formulaVersion,
            pricingNote,
            flyerBreakdown,
            carterieBreakdown,
            publicationBreakdown,
            packagingBreakdown,
          };
        }
      }
      if (productConfig?.priceTiers?.length) {
        const tier = pickAppliedConfigTier(productConfig.priceTiers, qty, productConfig.prixBase ?? 0);
        if (tier) {
          return {
            appliedTier: { label: tier.label, unitPrice: tier.unitPrice, source: tier.source },
            formulaVersion: null,
            pricingNote: null,
            flyerBreakdown: null,
            carterieBreakdown: null,
            publicationBreakdown: null,
            packagingBreakdown: null,
          };
        }
      }
      return {
        appliedTier: null,
        formulaVersion: null,
        pricingNote: null,
        flyerBreakdown: null,
        carterieBreakdown: null,
        publicationBreakdown: null,
        packagingBreakdown: null,
      };
    },
    [serverPrice, productConfig],
  );

  // Price calculation — serveur (PRIX 2026) prioritaire, fallback client
  // Estimation dès qty > 0 (même si config incomplete) ; le panier reste gateé par isReady.
  const priceCalc = useMemo(() => {
    const rawQty = config.qty ?? config.quantite;
    const hasQty =
      rawQty !== '' && rawQty !== undefined && rawQty !== null && Number(rawQty) > 0;
    const qty = textileQty > 0 ? textileQty : hasQty ? Number(rawQty) : 0;

    if (qty <= 0) {
      return {
        prixUnit: 0,
        sousTotal: 0,
        remiseRate: 0,
        remiseAmount: 0,
        totalHT: 0,
        clicheFee: 0,
        qty: 0,
        calculable: false,
      };
    }

    if (bacheEval?.surDevis && !bacheEval.finalTotal) {
      return {
        prixUnit: 0,
        sousTotal: 0,
        remiseRate: 0,
        remiseAmount: 0,
        totalHT: 0,
        clicheFee: parseFloat(config.cliche) || 0,
        qty,
        calculable: false,
      };
    }

    if (gfBillable?.surDevis) {
      return {
        prixUnit: 0,
        sousTotal: 0,
        remiseRate: 0,
        remiseAmount: 0,
        totalHT: 0,
        clicheFee: parseFloat(config.cliche) || 0,
        qty,
        calculable: false,
      };
    }

    const usesServerEngine = articleUsesUnifiedServerPricing(
      resolvedArticleId ?? '',
      article?.category,
    );

    const serverUsable =
      serverPrice != null
      && !serverPrice.surDevis
      && serverPrice.prixUnitaire > 0;

    // Moteur serveur OK → garder le dernier prix pendant soft-refresh (anti-clignotement « …Ar »)
    if (serverUsable) {
      return {
        prixUnit: serverPrice!.prixUnitaire,
        sousTotal: serverPrice!.sousTotal,
        remiseRate: serverPrice!.remiseRate,
        remiseAmount: serverPrice!.remiseAmount,
        totalHT: serverPrice!.totalHT,
        clicheFee: serverPrice!.clicheFee,
        qty: serverPrice!.qty ?? qty,
        calculable: true,
        ...resolvePriceCalcMeta(serverPrice!.qty ?? qty),
      };
    }

    // Premier calcul uniquement : pas encore de prix serveur → afficher … (pas de faux catalogue)
    if (usesServerEngine && serverPriceLoading) {
      return {
        prixUnit: 0,
        sousTotal: 0,
        remiseRate: 0,
        remiseAmount: 0,
        totalHT: 0,
        clicheFee: parseFloat(config.cliche) || 0,
        qty,
        calculable: false,
      };
    }

    // Moteurs unifiés (flyer / ISF / carterie…) : jamais de fallback prixDepart catalogue
    if (usesServerEngine) {
      return {
        prixUnit: 0,
        sousTotal: 0,
        remiseRate: 0,
        remiseAmount: 0,
        totalHT: 0,
        clicheFee: parseFloat(config.cliche) || 0,
        qty,
        calculable: false,
      };
    }

    let prixUnit = isStrictPosPricing() ? 0 : (article?.prixDepart ?? 0);

    if (productConfig?.priceTiers) {
      prixUnit = pickTierUnitPrice(productConfig.priceTiers, qty, prixUnit);
    } else if (productConfig?.prixBase) {
      prixUnit = productConfig.prixBase;
    }

    // Grand format: prix surface avec règle laize (fallback client)
    if (bacheEval?.finalTotal != null && bacheEval.finalTotal > 0) {
      const unit = Math.round(bacheEval.finalTotal / Math.max(1, qty));
      return {
        prixUnit: unit,
        sousTotal: bacheEval.finalTotal,
        remiseRate: 0,
        remiseAmount: 0,
        totalHT: bacheEval.finalTotal,
        clicheFee: parseFloat(config.cliche) || 0,
        qty,
        calculable: true,
      };
    }

    if (gfBillable?.calculable) {
      prixUnit = gfBillable.prixUnitaire;
    } else if (grandFormatM2 && effectiveProductConfig?.prixM2 && !gfBillable?.surDevis) {
      prixUnit = Math.round(effectiveProductConfig.prixM2 * grandFormatM2.m2);
    }

    // Box / etiquette / gobelet legacy: surface × prixCm2 (moteurs dédiés côté serveur)
    if (
      boxSurface
      && productConfig?.prixCm2
      && resolvedArticleId !== 'pkg-boite'
      && resolvedArticleId !== 'pkg-sac'
      && resolvedArticleId !== 'pkg-etiquette'
      && resolvedArticleId !== 'pkg-gobelet'
    ) {
      prixUnit = Math.round(productConfig.prixCm2 * boxSurface.surfaceCm2);
    }

    // Format personnalisé L×l : prix auto surface brute × prix m² ou cm²
    if (customSurfaceRecap && effectiveProductConfig?.prixM2) {
      prixUnit = Math.round(effectiveProductConfig.prixM2 * customSurfaceRecap.grossSurfaceM2);
    } else if (customSurfaceRecap && productConfig?.prixCm2) {
      prixUnit = Math.round(productConfig.prixCm2 * customSurfaceRecap.grossSurfaceM2 * 10_000);
    }

    // Face multiplier (skip finitions standalone déjà intégrées côté serveur)
    if (
      isRectoVerso(resolveConfigFace(config)) &&
      !shouldSkipRectoVersoMultiplier(resolvedArticleId ?? '', config)
    ) {
      prixUnit = Math.round(prixUnit * DEFAULT_FACE_RECTO_VERSO_MULT);
    }

    if (isStandaloneFinitionArticle(resolvedArticleId ?? '')) {
      const fin = applyFinitionArticlePricing(resolvedArticleId ?? '', prixUnit, config, qty);
      prixUnit = fin.prixUnitaire;
    }

    prixUnit = applyFinitionSurcharge(prixUnit, config, resolvedArticleId);

    const forced = resolveForcedUnitPrice(config);
    if (forced > 0) prixUnit = forced;

    const sousTotal = prixUnit * qty;
    const clicheFee = parseFloat(config.cliche) || 0;
    // Finitions : pas de remise volume générique (ex. 100 × 50 Ar = 5 000 Ar exact)
    const remiseRate = isStandaloneFinitionArticle(resolvedArticleId ?? '')
      ? 0
      : volumeRemiseRate(qty);
    const remiseAmount = Math.round(sousTotal * remiseRate);
    const totalHT = sousTotal - remiseAmount + clicheFee;

    return {
      prixUnit,
      sousTotal,
      remiseRate,
      remiseAmount,
      totalHT,
      clicheFee,
      qty,
      calculable: prixUnit > 0,
      ...resolvePriceCalcMeta(qty),
    };
  }, [config, article, productConfig, effectiveProductConfig, textileQty, grandFormatM2, gfBillable, bacheEval, boxSurface, customSurfaceRecap, serverPrice, serverPriceLoading, resolvedArticleId, resolvePriceCalcMeta]);

  const hasForcedPrice = resolveForcedUnitPrice(config) > 0;
  // Soft-refresh : garder « prêt » si un prix serveur est déjà affiché (évite clignotement panier)
  const priceReady =
    (priceCalc.calculable || hasForcedPrice)
    && isReady
    && !(serverPriceLoading && !priceCalc.calculable);
  const canAddToCart = canAddToCartBase && priceReady;
  const pricePending = priceGate.pricePending;
  // Devis possible si config prête mais prix non final (Admin gap OU sur devis moteur dédié)
  const runtimeNeedsQuote =
    Boolean(serverPrice?.surDevis)
    || (
      !serverPriceLoading
      && !priceReady
      && isReady
      && articleUsesUnifiedServerPricing(resolvedArticleId ?? '', article?.category)
    );
  const canCreateQuoteDraft = isReady && !priceReady && (pricePending || runtimeNeedsQuote);

  const serverPriceReason = useMemo(() => {
    if (serverPriceError) return serverPriceError;
    if (!serverPrice || serverPrice.prixUnitaire > 0 && !serverPrice.surDevis) return null;
    const snap = serverPrice.snapshot as Record<string, unknown> | undefined;
    const note =
      (typeof snap?.carterieNote === 'string' && snap.carterieNote)
      || (typeof snap?.flyerNote === 'string' && snap.flyerNote)
      || (typeof serverPrice.formulaApplied === 'string' && serverPrice.formulaApplied)
      || (typeof snap?.priceSource === 'string' && snap.priceSource)
      || null;
    if (note && /incomplete|missing|sur.?devis|notConfigured|tarif/i.test(note)) {
      return `Tarif moteur : ${note} — vérifier Administration (ISF / grilles / publication).`;
    }
    if (serverPrice.surDevis || serverPrice.prixUnitaire <= 0) {
      return 'Tarification à finaliser en Administration (prix moteur non calculable).';
    }
    return null;
  }, [serverPrice, serverPriceError]);

  const cartBlockReason = useMemo(() => {
    if (stockBlocked) return stockInfo?.message ?? 'Stock insuffisant';
    if (!isReady) {
      return bacheConfigError
        ?? gfConfigError
        ?? 'Complétez la configuration produit';
    }
    if (serverPriceLoading) return 'Calcul du prix en cours…';
    if (!priceReady && pricePending) {
      return 'Prix final à valider — créez une demande de devis ou complétez le tarif en Administration';
    }
    if (!priceReady) return serverPriceReason ?? UX_MSG.priceNotConfigured;
    return null;
  }, [stockBlocked, stockInfo, isReady, bacheConfigError, gfConfigError, serverPriceLoading, priceReady, pricePending, serverPriceReason]);

  const handleAddToCart = () => {
    if (!article || !canAddToCart) {
      if (stockBlocked) uxToast.error(stockInfo?.message ?? 'Stock insuffisant');
      else if (serverPriceLoading) uxToast.info('Calcul du prix en cours…');
      else if (!priceReady) uxToast.error(serverPriceReason ?? UX_MSG.priceNotConfigured);
      return;
    }
    let normalized = config;
    if (resolvedArticleId?.startsWith('fin-')) {
      normalized = normalizeFinitionConfig(resolvedArticleId, config);
    }
    const finErr = validateFinitionConfig(resolvedArticleId ?? '', normalized);
    if (finErr) {
      uxToast.error(finErr);
      return;
    }
    const bindErr = articleUsesBindingEngine(resolvedArticleId ?? '')
      ? bindingValidationMessage(normalized)
      : null;
    if (bindErr) {
      uxToast.error(bindErr);
      return;
    }
    const livresErr = isLivresArticleId(resolvedArticleId ?? '') ? validateLivresConfig(normalized) : null;
    if (livresErr) {
      uxToast.error(livresErr);
      return;
    }
    const bacheErr = isBacheArticle ? validateBacheConfig(normalized) : null;
    if (bacheErr) {
      uxToast.error(bacheErr);
      return;
    }
    const gfErr = isGfArticle && !isBacheArticle && resolvedArticleId
      ? validateGfConfig(resolvedArticleId, normalized)
      : null;
    if (gfErr) {
      uxToast.error(gfErr);
      return;
    }
    const technoAlert = getPrintTechnologyCompatAlert(
      {
        matiere: String(normalized.matiere ?? normalized.matiere_feuillets ?? ''),
        grammage: String(normalized.grammage ?? normalized.grammage_feuillets ?? ''),
        articleId: resolvedArticleId,
      },
      String(normalized.technologie ?? normalized.technologie_interieur ?? normalized.technologie_couverture ?? ''),
    );
    if (technoAlert) {
      uxToast.error(technoAlert);
      return;
    }
    const { config: paperNorm, migrated } = normalizePaperInConfig(normalized);
    if (migrated) setConfig(paperNorm);
    normalized = paperNorm;

    if (isFlyerArticleId(resolvedArticleId, article?.category)) {
      const minQ = getFlyerMinQty(String(normalized.format ?? ''));
      const qty = resolveConfigQty(normalized, priceCalc.qty ?? 1);
      if (qty < minQ) {
        uxToast.error(`Quantité minimum pour ce format : ${minQ} ex.`);
        return;
      }
    }

    const calendarSnapshot =
      calendarRecap && resolvedArticleId
        ? buildCalendarCalculationSnapshot(resolvedArticleId, normalized, {
            unitPrice: priceCalc.prixUnit ?? 0,
            prixM2: effectiveProductConfig?.prixM2 ?? productConfig?.prixM2,
          })
        : null;

    const qtyLine = resolveConfigQty(normalized, priceCalc.qty ?? 1);
    const packagingSnapshot =
      boxSurface && resolvedArticleId
        ? buildPackagingCalculationSnapshot(resolvedArticleId, normalized, {
            unitPrice: priceCalc.prixUnit ?? 0,
            qty: qtyLine,
            prixCm2: resolvedArticleId === 'pkg-boite'
              ? undefined
              : (effectiveProductConfig?.prixCm2 ?? productConfig?.prixCm2),
          })
        : null;
    const packagingSnapRaw = (serverPrice?.snapshot as Record<string, unknown> | undefined)
      ?.packagingBoxPricing as PackagingBoxPriceResult | undefined;
    const packagingSnapshotV2 =
      resolvedArticleId === 'pkg-boite' && packagingSnapRaw?.calculable
        ? buildPackagingBoxPriceSnapshotV2(resolvedArticleId, normalized, packagingSnapRaw)
        : ((serverPrice?.snapshot as Record<string, unknown> | undefined)?.packagingSnapshotV2 as ReturnType<
            typeof buildPackagingBoxPriceSnapshotV2
          > | null) ?? null;

    const surfaceSnapshot = resolvedArticleId
      ? buildCustomSurfaceSnapshotForArticle(resolvedArticleId, normalized, {
          unitPrice: priceCalc.prixUnit ?? 0,
          qty: qtyLine,
        })
      : null;

    const bindingSnapshot = resolvedArticleId
      ? buildBindingCalculationSnapshot(resolvedArticleId, normalized)
      : null;

    const clientMeta = getClientSnapshotForCart();
    const linePayload = {
      articleId: resolvedArticleId,
      name: article.name ?? '',
      category: article.category ?? '',
      clientId: clientMeta?.id,
      clientSnapshot: clientMeta ?? undefined,
      addedAt: new Date().toISOString(),
      config: {
        ...normalized,
        ...(effectiveProductConfig?.posBanner || productConfig?.posBanner
          ? { product_banner: effectiveProductConfig?.posBanner ?? productConfig?.posBanner }
          : {}),
        ...(isBacheArticle && bacheEval
          ? bacheCartSnapshot(
              bacheEval,
              gfProfile?.prixA0 ?? gfProfile?.prixM2 ?? effectiveProductConfig?.prixM2,
            )
          : gfBillable
            ? { _gfBillable: gfBillable }
            : {}),
        ...(calendarSnapshot ? { _calendarSnapshot: calendarSnapshot } : {}),
        ...(packagingSnapshot ? { _packagingSnapshot: packagingSnapshot } : {}),
        ...(packagingSnapshotV2 ? { _packagingSnapshotV2: packagingSnapshotV2 } : {}),
        ...(surfaceSnapshot ? { _surfaceSnapshot: surfaceSnapshot } : {}),
        ...(bindingSnapshot ? { _bindingSnapshot: bindingSnapshot } : {}),
        ...(serverPrice?.snapshot
          ? {
              _pricingSnapshot: buildPricingSnapshotEnvelope({
                articleId: resolvedArticleId,
                articleLabel: article.name ?? '',
                qty: qtyLine,
                prixUnitaire: priceCalc.prixUnit ?? 0,
                sousTotal: priceCalc.sousTotal ?? 0,
                remiseRate: priceCalc.remiseRate ?? 0,
                remiseAmount: priceCalc.remiseAmount ?? 0,
                clicheFee: priceCalc.clicheFee ?? 0,
                totalHT: priceCalc.totalHT ?? 0,
                totalTTC: htToTtcMga(priceCalc.totalHT ?? 0, DEFAULT_FISCAL.tvaRate),
                pricingMode: 'auto',
                formulaApplied: serverPrice.formulaApplied,
                snapshot: serverPrice.snapshot,
              }),
            }
          : {}),
      },
      quantity: qtyLine,
      prixUnitaire: priceCalc.prixUnit ?? 0,
      totalLigne: priceCalc.totalHT ?? 0,
    };

    if (editCartId && getCart().some((c) => c.id === editCartId)) {
      updateCartItem(editCartId, linePayload);
      uxToast.success('Article modifié avec succès');
      emitCommercialJourney('cart_ready', {
        clientId: salesClient?.id ?? null,
        cartCount: getCart().length,
      });
      router.push('/panier');
    } else {
      addToCart({ id: `${resolvedArticleId}-${Date.now()}`, ...linePayload });
      const cartCount = getCart().length;
      emitCommercialJourney('cart_ready', {
        clientId: salesClient?.id ?? null,
        cartCount,
      });
      uxToast.success(UX_MSG.cartItemAdded);
    }
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handleReset = () => {
    setConfig(buildEmptyPosConfig(productConfig));
    uxToast.success('Configuration réinitialisée');
  };

  const handleCreateQuoteDraft = async () => {
    if (!article || !isReady) {
      uxToast.error('Complétez la configuration produit avant de créer le devis');
      return;
    }
    if (!salesClient?.id) {
      uxToast.info('Sélectionnez un client pour finaliser le devis');
      requestClientChange?.();
      return;
    }
    let normalized = config;
    if (resolvedArticleId?.startsWith('fin-')) {
      normalized = normalizeFinitionConfig(resolvedArticleId, config);
    }
    const qty = Math.max(1, Number(normalized.qty ?? normalized.quantite ?? priceCalc.qty ?? 1));
    setQuoteDraftLoading(true);
    try {
      const res = await fetch('/api/devis', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: salesClient.id,
          remise: 0,
          notes: `[POS] Prix à compléter — ${article.name}`,
          lignes: [{
            articleId: resolvedArticleId ?? article.id,
            articleLabel: article.name,
            category: article.category,
            configSnapshot: normalized,
            quantity: qty,
            unite: article.unit ?? 'ex.',
            prixUnitaireAuto: 0,
            pricingMode: 'force',
            priceReason: 'Prix final à valider',
            remarks: typeof normalized.notes === 'string' ? normalized.notes : null,
          }],
        }),
      });
      const payload = await res.json() as { ok?: boolean; data?: { id: string }; error?: { message?: string } };
      if (!res.ok || payload.ok === false) {
        throw new Error(payload.error?.message ?? classifyFetchError(res));
      }
      const devisId = payload.data?.id;
      if (!devisId) throw new Error('Réponse devis invalide');
      uxToast.success('Devis brouillon créé — prix à compléter par l’administration');
      router.push(`/devis?id=${encodeURIComponent(devisId)}`);
    } catch (e: unknown) {
      uxToast.error(classifyFetchError(e));
    } finally {
      setQuoteDraftLoading(false);
    }
  };

  if (!article) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="font-semibold">Article non trouvé</h3>
        <button onClick={() => router.push(backHref)} className="mt-4 text-sm text-accent-brand hover:underline">{backLabel}</button>
      </div>
    );
  }

  if (!apiArticleLoaded) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Vérification du profil tarifaire…
      </div>
    );
  }

  if (articleLoadError) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="font-semibold">Catalogue POS indisponible</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{articleLoadError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 text-sm ans-btn-primary px-4 py-2 rounded-lg"
        >
          Réessayer
        </button>
        <button type="button" onClick={() => router.push(backHref)} className="mt-3 block mx-auto text-sm text-accent-brand hover:underline">
          {backLabel}
        </button>
      </div>
    );
  }

  if (priceGate.blocked) {
    return (
      <PosPriceConfigureBlock
        articleName={article.name}
        reason={priceGate.reason}
        adminHref={priceGate.adminHref ?? undefined}
        backHref={backHref}
        backLabel={backLabel}
      />
    );
  }

  const panierHref = appendPosQueryParam('/panier', 'commande', commandeQueryId);

  const summaryProps = {
    article,
    config,
    updateConfig,
    productConfig: displayProductConfig ?? effectiveProductConfig ?? productConfig ?? null,
    stockInfo,
    isReady,
    canAddToCart,
    canCreateQuoteDraft,
    quoteDraftLoading,
    pricePending,
    priceReady,
    priceLoading: serverPriceLoading,
    priceError: serverPriceReason,
    cartBlockReason,
    completion,
    boxSurface,
    calendarRecap,
    blocNoteRecap,
    plvRecap,
    livresRecap,
    customSurfaceRecap,
    grandFormatM2,
    gfBillable,
    priceCalc,
    marginInsight: showMargin ? serverPrice?.margin ?? null : null,
    showMargin,
    onAddToCart: handleAddToCart,
    onCreateDevis: () => {
      handleAddToCart();
      router.push(panierHref);
    },
    onCreateQuoteDraft: handleCreateQuoteDraft,
    onReset: handleReset,
    hideGfSurfaceBlock: isBacheArticle,
    bachePrixM2: gfProfile?.prixM2 ?? effectiveProductConfig?.prixM2 ?? null,
    editMode: !!editCartId,
    onCancelEdit: () => router.push('/panier'),
    onFocusField: (fieldKey: string) => {
      locatePosField(fieldKey);
    },
  };

  return (
    <PosClientRequired>
    {configSchemaLoading && !productConfig ? (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Chargement configurateur produit…
      </div>
    ) : (
      <div className="pos-soft-shell pos-soft-shell--config space-y-4 pb-28 md:pb-0 w-full max-w-none"
        style={{ ['--pos-cat' as string]: catDef?.color ?? '#FF174D' }}
      >
      {salesClient && (
        <div className="pos-legacy-client-banner">
          <SalesClientBanner
            client={salesClient}
            compact
            onChangeClient={requestClientChange}
            onNewOrder={requestNewOrder}
          />
        </div>
      )}
      <PosContinueCartBanner />
      {commandeLinkInfo && <CommandeDeepLinkBanner info={commandeLinkInfo} />}
      {((pricePending || runtimeNeedsQuote) && !priceReady) && (
        <PosPricePendingBanner
          articleName={article.name}
          priceMode={
            serverPrice?.surDevis || priceGate.priceMode === 'quote_required'
              ? 'quote_required'
              : priceGate.priceMode
          }
          reason={
            serverPriceReason
            ?? priceGate.reason
            ?? (serverPrice?.surDevis
              ? 'Configuration hors grille standard — finalisez en devis ou prix forcé.'
              : null)
          }
          adminHref={priceGate.adminHref ?? undefined}
          onCreateQuoteDraft={canCreateQuoteDraft ? handleCreateQuoteDraft : undefined}
          quoteDraftLoading={quoteDraftLoading}
        />
      )}

      <div className="pos-config-layout">
        {/* Left: Configurator */}
        <div
          className="pos-config-main"
          style={{ ['--pos-cat' as string]: catDef?.color ?? '#FF174D' }}
        >
          {/* Header — produit + politique prix + client (1 ligne) */}
          <ProductConfiguratorHeader
            article={article}
            catDef={catDef}
            productConfig={displayProductConfig ?? effectiveProductConfig ?? productConfig ?? null}
            backSlot={
              <button
                type="button"
                onClick={() => router.push(backHref)}
                className="pos-back-link pos-back-link--inline"
              >
                <span className="pos-back-link__ico" aria-hidden>
                  <ArrowLeft size={12} strokeWidth={2.5} />
                </span>
                {backLabel || 'Retour au catalogue'}
              </button>
            }
            policySlot={
              apiArticle?.directSale ? (
                <DirectSalePolicyBanner article={apiArticle} compact />
              ) : null
            }
            clientSlot={
              salesClient ? (
                <div className="pos-client-pill">
                  <div className="pos-client-pill__avatar" aria-hidden>
                    {(salesClient.name || 'C')
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase() ?? '')
                      .join('') || 'C'}
                  </div>
                  <div className="hidden sm:block min-w-0 pr-1">
                    <div className="pos-client-pill__name">
                      {salesClient.name}
                    </div>
                    <div className="pos-client-pill__role">
                      {salesClient.clientFidele ? 'Client fidèle' : 'Client Pro'}
                    </div>
                  </div>
                  {requestClientChange && (
                    <button type="button" className="pos-client-pill__btn" onClick={requestClientChange}>
                      Changer
                    </button>
                  )}
                </div>
              ) : null
            }
          />

          <PosStepAssistant
            productConfig={displayProductConfig ?? effectiveProductConfig ?? productConfig}
            config={config}
            completion={completion}
          />
          <div className="pos-stepper-fade" aria-hidden />

          {/* Zone scrollable — stepper + synthèse restent fixes */}
          <div className="pos-config-scroll">
          {displayProductConfig ? (
            <div className="pos-config-sections">
              {displayProductConfig.sections.map((section: ConfigSection, sIdx: number) => (
                <DynamicSection
                  key={sIdx}
                  section={section}
                  articleId={resolvedArticleId}
                  articleCategory={article?.category}
                  productConfig={displayProductConfig}
                  config={config}
                  updateConfig={updateConfig}
                  onChipSelect={handleChipSelect}
                  catColor={catDef?.color ?? '#FF174D'}
                  materialWeights={materialWeights}
                  printMaterialOptions={printMaterialOptions}
                  adminChips={adminChips}
                  optionOverrides={optionOverrides}
                  gfLaizeAvailability={gfLaizeAvailability}
                  compactCollapse
                />
              ))}
            </div>
          ) : (
            // Fallback generic config
            <div className="bg-card border border-border rounded-[7px] p-4 text-center space-y-3">
              <Info size={20} className="text-muted-foreground mx-auto" />
              <p className="text-[11px] text-muted-foreground">
                Pas de formulaire produit publié — chiffrage sur devis.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {canCreateQuoteDraft ? (
                  <button
                    type="button"
                    className="rounded-[7px] bg-[#FF174D] px-3 py-1.5 text-[11px] font-semibold text-white"
                    onClick={() => void handleCreateQuoteDraft()}
                    disabled={quoteDraftLoading}
                  >
                    {quoteDraftLoading ? 'Création…' : 'Créer un devis brouillon'}
                  </button>
                ) : null}
                <a
                  href={`/administration/catalogue-pos?article=${encodeURIComponent(resolvedArticleId ?? '')}`}
                  className="rounded-[7px] border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted"
                >
                  Ouvrir en Administration
                </a>
              </div>
            </div>
          )}

          {isBacheArticle && (
            <div className="mt-2 rounded-[7px] border border-border bg-card p-3">
              <BacheFinishingsSelector
                value={config.bache_finitions ?? parseBacheFinishings(config)}
                onChange={(next) => updateConfig('bache_finitions', next)}
              />
            </div>
          )}
          </div>

        </div>

        {/* Right: Summary Panel (tablette + desktop) */}
        <aside className="pos-config-summary hidden md:block pos-summary-sticky" aria-label="Récapitulatif configuration">
          <PosSummaryContent {...summaryProps} />
        </aside>
      </div>

      <PosMobileSummary
        isReady={isReady}
        canAddToCart={canAddToCart}
        canCreateQuoteDraft={canCreateQuoteDraft}
        pricePending={pricePending}
        priceReady={priceReady}
        priceLoading={serverPriceLoading}
        disabledReason={cartBlockReason}
        priceCalc={priceCalc}
        onAddToCart={handleAddToCart}
        onCreateQuoteDraft={handleCreateQuoteDraft}
        quoteDraftLoading={quoteDraftLoading}
        editMode={!!editCartId}
      >
        <PosSummaryContent {...summaryProps} showActions={false} />
      </PosMobileSummary>
    </div>
    )}
    </PosClientRequired>
  );
}

// ═════ Dynamic Section Component ═════
function DynamicSection({ section, articleId, articleCategory, productConfig, config, updateConfig, onChipSelect, catColor, materialWeights, printMaterialOptions, adminChips, optionOverrides, gfLaizeAvailability, onlyFieldKeys, hideSectionHead = false, compactCollapse = false }: {
  section: ConfigSection;
  articleId: string;
  articleCategory?: string;
  productConfig: ProductConfig | null | undefined;
  config: Record<string, any>;
  updateConfig: (key: string, value: any) => void;
  onChipSelect: (field: ConfigField, option: string) => void;
  catColor: string;
  materialWeights: Record<string, string[]>;
  printMaterialOptions: string[];
  adminChips: Record<string, ChipAdminEntry>;
  optionOverrides: ProductOptionOverrides | null;
  gfLaizeAvailability: Record<string, boolean>;
  onlyFieldKeys?: string[];
  hideSectionHead?: boolean;
  /** Page unique : replie les sections déjà complètes pour limiter le scroll */
  compactCollapse?: boolean;
}) {
  const [open, setOpen] = useState(true);
  /** null | path (contour rouge 1 tour) | tint (flash fond, sans bordure colorée) */
  const [locatePhase, setLocatePhase] = useState<'path' | 'tint' | null>(null);
  const [locateNonce, setLocateNonce] = useState(0);
  const initCollapseDone = useRef(false);
  const locateTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearLocateTimers = () => {
    locateTimers.current.forEach(clearTimeout);
    locateTimers.current = [];
  };

  const sectionHidden = Boolean(
    section.showWhen
    && !section.showWhen.values.includes(config[section.showWhen.field]),
  );

  const keyFilter = onlyFieldKeys ? new Set(onlyFieldKeys) : null;
  const gfOrBache = isGrandFormatArticleId(articleId) || isBacheArticleId(articleId);
  const showLaizeFields = !gfOrBache || isGrandFormatCustomFormat(config);
  const visibleFields = sectionHidden
    ? []
    : section.fields.filter((field) => {
      if (!isFieldVisible(field, config)) return false;
      if (keyFilter && !keyFilter.has(field.key)) return false;
      // Formats ISO A0–A5 : masquer laize / plaque (calcul hors laize).
      if (
        !showLaizeFields
        && (field.key === 'laize'
          || field.key === 'laize_plaque'
          || field.key === 'laize_autre'
          || field.key === 'laize_plaque_autre')
      ) {
        return false;
      }
      return true;
    });

  const progressFields = visibleFields.filter(isPosProgressField);
  const sectionComplete =
    progressFields.length > 0
    && progressFields.every((f) => isFieldValueComplete(f, config[f.key], config));
  // Œillets bâche : toujours déployé (placement interactif) — jamais replié
  const forceKeepOpen = section.fields.some((f) => f.type === 'bache_eyelets');

  // Replie au chargement les sections déjà complètes (defaults) — pas en cours de saisie
  useEffect(() => {
    if (sectionHidden || !compactCollapse || forceKeepOpen || initCollapseDone.current) return;
    initCollapseDone.current = true;
    if (sectionComplete) setOpen(false);
  }, [sectionHidden, compactCollapse, forceKeepOpen, sectionComplete]);

  // Clic stepper : 1) contour rouge fluide (1 tour) 2) flash fond — tous articles POS
  useEffect(() => {
    const onLocate = (ev: Event) => {
      const fieldKey = (ev as CustomEvent<{ fieldKey: string }>).detail?.fieldKey;
      if (!fieldKey) return;
      const owns = section.fields.some((f) => f.key === fieldKey);
      if (!owns) return;
      if (onlyFieldKeys && !onlyFieldKeys.includes(fieldKey)) return;

      const startAnim = () => {
        clearLocateTimers();
        setLocatePhase('path');
        setLocateNonce((n) => n + 1);
        locateTimers.current.push(
          setTimeout(() => setLocatePhase('tint'), 1200),
        );
        locateTimers.current.push(
          setTimeout(() => setLocatePhase(null), 1200 + 1150),
        );
      };

      // Ouvrir d’abord si replié, puis animer le cadre extérieur (comme Packaging)
      setOpen(true);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(startAnim);
      });
    };
    window.addEventListener(POS_LOCATE_FIELD, onLocate);
    return () => {
      window.removeEventListener(POS_LOCATE_FIELD, onLocate);
      clearLocateTimers();
    };
  }, [section.fields, onlyFieldKeys]);

  if (sectionHidden) return null;
  if (visibleFields.length === 0) return null;

  const collapsed = Boolean(compactCollapse && sectionComplete && !open && !forceKeepOpen);

  const layout = resolveSectionLayout(section, visibleFields.length);
  const isGrid = layout !== 'stack';

  const summaryBits = progressFields
    .map((f) => {
      const v = config[f.key];
      if (v === '' || v === undefined || v === null) return null;
      const label = formatPosFieldDisplay(f, v, config);
      if (!label || label === '—' || label === 'non choisi') return null;
      return label;
    })
    .filter(Boolean)
    .slice(0, 3) as string[];

  if (collapsed) {
    return (
      <button
        type="button"
        className={cn(
          'pos-section-card pos-section-card--collapsed',
          locatePhase && 'is-locate-section',
        )}
        onClick={() => setOpen(true)}
        aria-expanded={false}
      >
        <span className="pos-section-card--collapsed__check" aria-hidden>
          <Check size={12} strokeWidth={3} />
        </span>
        <span className="pos-section-card--collapsed__icon" aria-hidden>{section.icon}</span>
        <span className="pos-section-card--collapsed__title">{section.title}</span>
        <span className="pos-section-card--collapsed__sum truncate">
          {summaryBits.join(' · ') || 'Complété'}
        </span>
        <ChevronDown size={14} className="pos-section-card--collapsed__chev" aria-hidden />
      </button>
    );
  }

  let lastGroup: string | undefined;
  let groupIndex = 0;
  const fieldNodes: ReactNode[] = [];

  for (const field of section.fields) {
    if (!isFieldVisible(field, config)) continue;
    if (keyFilter && !keyFilter.has(field.key)) continue;
    if (isManagedCustomFormatDimensionField(field, productConfig, config)) continue;

    if (isGrid && field.group && field.group !== lastGroup) {
      const isFirstGroup = groupIndex === 0;
      groupIndex += 1;
      lastGroup = field.group;
      fieldNodes.push(
        <div
          key={`group-${field.group}`}
          className={cn(
            'col-span-full flex items-center gap-2',
            !isFirstGroup && 'mt-0.5 pt-2 border-t border-border/40',
          )}
        >
          <span className="orion-text-meta font-semibold text-accent-brand/90 shrink-0">
            {field.group}
          </span>
          <div className="flex-1 h-px bg-border/50" />
        </div>,
      );
    }

    const spanClass = isGrid ? fieldGridSpanClass(field, config) : '';
    fieldNodes.push(
      <div
        key={field.key}
        id={`pos-field-${field.key}`}
        className={cn(
          'min-w-0 pos-select-zone pos-field-nest w-full',
          spanClass,
        )}
      >
        <DynamicField
          articleId={articleId}
          articleCategory={articleCategory}
          productConfig={productConfig}
          field={field}
          value={config[field.key]}
          onChange={(v: any) => updateConfig(field.key, v)}
          onChipSelect={onChipSelect}
          catColor={catColor}
          config={config}
          updateConfig={updateConfig}
          materialWeights={materialWeights}
          printMaterialOptions={printMaterialOptions}
          adminChips={adminChips}
          optionOverrides={optionOverrides}
          gfLaizeAvailability={gfLaizeAvailability}
          compact={isGrid}
        />
      </div>,
    );
  }

  const showPath = locatePhase === 'path';
  const showTint = locatePhase === 'tint';

  return (
    <div
      className={cn(
        hideSectionHead ? 'pos-section-card pos-section-card--wizard' : 'pos-section-card pos-section-card--dense',
        isGrid ? 'pos-section-card--grid' : '',
        locatePhase && 'is-locate-section is-locate-zone',
        showPath && 'is-locate-path',
        showTint && 'is-locate-tint',
      )}
      style={{ ['--pos-locate-tint' as string]: catColor }}
    >
      {showPath ? <PosLocatePathFrame key={`sec-${locateNonce}`} /> : null}
      {!hideSectionHead ? (
        <div className="pos-section-card__head">
          <div className="flex gap-2.5 min-w-0 items-center">
            <div className="pos-section-card__icon" aria-hidden>
              <span>{section.icon}</span>
            </div>
            <div className="min-w-0">
              <h3 className="pos-section-card__title">{section.title}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {visibleFields.some((f) =>
              /format|matiere|matière|grammage|quantit|dimension|laize|face|papier/i.test(
                `${f.key} ${f.label ?? ''}`,
              ),
            ) ? (
              <span className="pos-impact-badge">Impact prix</span>
            ) : null}
            {compactCollapse && sectionComplete && !forceKeepOpen ? (
              <button
                type="button"
                className="pos-section-card__collapse-btn"
                onClick={() => setOpen(false)}
                aria-label="Replier la section"
              >
                Replier
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className={cn(sectionGridClass(layout), 'relative z-[1]')}>
        {fieldNodes}
      </div>
    </div>
  );
}

// ═════ Dynamic Field Component ═════
function DynamicField({ articleId, articleCategory, productConfig, field, value, onChange, onChipSelect, catColor, config, updateConfig, materialWeights, printMaterialOptions, adminChips, optionOverrides, gfLaizeAvailability, compact = false }: {
  articleId: string;
  articleCategory?: string;
  productConfig?: ProductConfig | null;
  field: ConfigField;
  value: any;
  onChange: (v: any) => void;
  onChipSelect: (field: ConfigField, option: string) => void;
  catColor: string;
  config?: Record<string, any>;
  updateConfig?: (key: string, value: any) => void;
  materialWeights?: Record<string, string[]>;
  printMaterialOptions?: string[];
  adminChips?: Record<string, ChipAdminEntry>;
  optionOverrides?: ProductOptionOverrides | null;
  gfLaizeAvailability?: Record<string, boolean>;
  compact?: boolean;
}) {
  const fieldOverride = getFieldOverride(optionOverrides ?? null, field.key);
  // Force price warning
  const isForcedPrice = shouldShowForcedPriceWarning(field, value, productConfig, articleId);

  // ── Color Palette ── (with paletteFilter support)
  if (field.type === 'color_palette') {
    let palette = field.palette ?? [];
    // Dynamic palette based on another field value
    if (field.paletteFilter && config) {
      const filterVal = config[field.paletteFilter.field];
      if (filterVal && field.paletteFilter.palettes[filterVal]) {
        palette = field.paletteFilter.palettes[filterVal];
      } else {
        // Use first available palette or empty
        const first = Object.values(field.paletteFilter.palettes)[0];
        palette = first || [];
      }
    }
    const isDetailOnly = field.key === 'couleur_doypack' || field.label.toLowerCase().includes('détail');
    const selected = palette.find((c) => c.label === value);
    const matiereHint =
      field.paletteFilter?.field && config
        ? String(config[field.paletteFilter.field] ?? '').trim()
        : '';
    return (
      <div className="space-y-2">
        <PosFieldLabel
          articleId={articleId}
          field={field}
          className="mb-1 w-full justify-between"
          override={fieldOverride}
          hint={
            isDetailOnly ? (
              <span className="text-[9px] text-muted-foreground italic ml-auto">
                Détails devis uniquement
                {matiereHint ? ` · ${matiereHint}` : ''}
              </span>
            ) : undefined
          }
        />
        <div className="pos-swatch-nest">
          <div className="pos-chip-rail pos-chip-rail--swatches" role="listbox" aria-label={field.label}>
            {palette.map((c) => {
              const isSel = value === c.label;
              const look = c.look ?? (c.badge === 'translucide' ? 'translucent' : 'solid');
              const light =
                look === 'translucent'
                || c.hex === '#FFFFFF'
                || c.hex === '#FFFFF0'
                || c.hex === '#FAF5EF'
                || c.hex === '#F0F9FF'
                || c.hex === '#F8FAFC'
                || c.hex === '#E8E8E8';
              return (
                <button
                  key={c.id}
                  type="button"
                  title={c.badge ? `${c.label} (${c.badge})` : c.label}
                  aria-label={c.badge ? `${c.label} — ${c.badge}` : c.label}
                  aria-selected={isSel}
                  onClick={() => onChange(c.label)}
                  className={`pos-color-swatch pos-color-swatch--${look} ${isSel ? 'is-selected' : ''} ${light ? 'is-light' : ''}`}
                  style={
                    look === 'translucent'
                      ? { ['--swatch-tint' as string]: c.hex }
                      : { backgroundColor: c.hex }
                  }
                />
              );
            })}
          </div>
          {selected && (
            <p className="text-slate-500 font-medium">
              Sélection : <span className="font-bold text-slate-800 dark:text-slate-100">{selected.label}</span>
              {selected.badge && <span className="ml-1.5 text-[#F59E0B]">({selected.badge})</span>}
              {matiereHint && (
                <span className="ml-1.5 text-muted-foreground">· matière {matiereHint}</span>
              )}
            </p>
          )}
        </div>
        {field.note && <p className="orion-text-meta mt-1 italic">ℹ {field.note}</p>}
        {isForcedPrice && <p className="orion-text-meta font-semibold text-[#F59E0B] mt-1.5">⚠ Prix forcé obligatoire pour cette couleur</p>}
      </div>
    );
  }

  // ── Size-Quantity Table ──
  if (field.type === 'size_qty_table') {
    const tableData: Record<string, number> = typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
    const groups = field.sizeGroups ?? [];
    const totalQty = Object.values(tableData).reduce((sum: number, q: number) => sum + (q || 0), 0);
    return (
      <div>
        <PosFieldLabel articleId={articleId} field={field} className="mb-1.5" override={fieldOverride} />
        {groups.map(group => (
          <div key={group.label} className="mb-3">
            <p className="orion-text-meta font-medium mb-1">{group.label}</p>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {group.sizes.map(sz => (
                <div key={sz} className="flex flex-col items-center gap-1">
                  <span className="orion-text-meta font-medium">{sz}</span>
                  <input type="number" min={0} value={tableData[sz] || ''} placeholder="0" onChange={e => { const nv = parseInt(e.target.value) || 0; onChange({ ...tableData, [sz]: nv }); }} className="w-full text-center bg-accent rounded-lg py-1.5 text-xs font-mono outline-none" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="text-xs font-mono text-accent-brand mt-1">Total : {totalQty} pièce(s)</div>
      </div>
    );
  }

  // ── Coins arrondis ──
  if (field.type === 'corner_rounding') {
    const cr = parseCornerRounding(value ?? config?.cornerRounding);
    return (
      <CornerRoundingSelector
        value={cr}
        onChange={(next) => onChange(next)}
        compact={compact}
      />
    );
  }

  // ── Œillets bâche (visuel) ──
  if (field.type === 'bache_eyelets') {
    const dims = getBacheDimensionsCm(config ?? {});
    const hasDims = dims.longueurCm > 0 && dims.largeurCm > 0;
    const eyeData = parseBacheEyelets(value);
    if (!hasDims) {
      return (
        <div className="rounded-[7px] border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-3 orion-text-meta">
          <p className="font-semibold text-[#F59E0B] mb-1">Dimensions requises</p>
          <p>Renseignez d&apos;abord la longueur et la largeur / hauteur pour configurer les œillets.</p>
        </div>
      );
    }
    return (
      <BacheEyeletsSelector
        value={eyeData}
        onChange={(next) => onChange(next)}
        longueurCm={dims.longueurCm}
        largeurCm={dims.largeurCm}
        compact={compact}
      />
    );
  }

  if (field.type === 'chips') {
    let opts = field.options ?? [];
    const isGrammageField = isGrammageFieldKey(field.key);
    const isMatiereField = field.key === 'matiere' || field.key.startsWith('paperType') || field.key.startsWith('matiere_') || field.key === 'famille_papier';

    if (isGrammageField && config) {
      if (isFlyerArticleId(articleId, articleCategory) && field.optionsFilter) {
        opts = resolveFlyerGrammageOptions(field, config, articleId, articleCategory);
      } else if (isImpressionSfArticleId(articleId, articleCategory) && field.optionsFilter) {
        opts = resolveImpressionSfGrammageOptions(field, config);
      } else if (CONFIG_GRAMMAGE_ARTICLE_IDS.has(articleId) && field.optionsFilter) {
        opts = resolveGrammageOptions(field, config, {});
      } else if (field.optionsFilter) {
        opts = resolveGrammageOptions(field, config, materialWeights ?? {});
      } else if (materialWeights && Object.keys(materialWeights).length > 0) {
        const dbOpts = grammageOptionsForConfig(field.key, config, materialWeights, opts);
        if (dbOpts.length) opts = dbOpts;
      }
    } else if (field.optionsFilter && config) {
      const filterVal = config[field.optionsFilter.field];
      if (filterVal && field.optionsFilter.optionsByValue[filterVal]) {
        opts = field.optionsFilter.optionsByValue[filterVal];
      } else if (isGrammageField) {
        opts = [];
      }
    }

    if (articleId && isBacheArticleId(articleId) && field.key === 'grammage' && config?.type_bache) {
      opts = grammagesForBacheType(String(config.type_bache));
    }

    if (articleId && isBacheArticleId(articleId) && field.key === 'laize' && config?.type_bache) {
      const cms = getBacheAvailableLaizesCm(
        String(config.type_bache),
        String(config.grammage ?? ''),
      );
      const allowed = new Set(cms.map((cm) => cmToLaizeChipLabel(cm)));
      opts = opts.filter((o) => allowed.has(o) || o === 'Autres');
    }

    if (articleId && isBacheArticleId(articleId) && field.key === 'face' && config?.dos) {
      if (!impressionAllowsRectoVerso(String(config.dos))) {
        opts = opts.filter((o) => !/verso/i.test(o));
      }
    }

    if (isMatiereField && printMaterialOptions?.length && shouldInjectPrintMaterialCatalog(articleId, articleCategory)) {
      const skipSpecialMatiere = ['matiere_couv', 'matiere_couverture', 'matiere_int'].includes(field.key);
      if (!skipSpecialMatiere) {
      const excluded = new Set([
        'PCB pelliculé',
        'Papier pelliculé',
        'Papier pelliculé (mat ou brillant)',
        'Papier cover luxe',
      ]);
      const filteredPrint = printMaterialOptions.filter((o) => !excluded.has(o));
      const custom = (field.options ?? []).filter((o) => o.toLowerCase().includes('personnalis'));
      opts = [...new Set([...filteredPrint, ...custom])];
      }
    }

    if (field.key === 'matiere' && isCarteArticleId(articleId)) {
      opts = filterCarteMatiereOptions(articleId, opts.length ? opts : (field.options ?? []));
    }
    if (field.key === 'matiere' || field.key.startsWith('matiere_')) {
      opts = filterRetiredMaterialOptions(opts.length ? opts : (field.options ?? []));
      if (isCalendarArticleId(articleId)) {
        opts = filterCalendarMaterialOptions(articleId, opts);
      }
    }
    if (field.key === 'matiere') {
      opts = filterFlyerMatiereOptions(articleId, opts.length ? opts : (field.options ?? []), articleCategory);
      if (isImpressionSfArticleId(articleId, articleCategory) && config) {
        opts = filterImpressionSfMatiereOptions(String(config.format ?? ''), opts);
      }
    }
    if (field.key === 'face' && isCarteArticleId(articleId) && config) {
      opts = filterCarteFaceOptions(String(config.matiere ?? ''), opts);
    }

    if (articleId === 'fin-pelliculage' && field.key === 'sous_type' && config) {
      opts = filterPelliculageProcedeOptions(String(config.type ?? ''), opts);
    }
    if (articleId === 'fin-autocollant' && field.key === 'type') {
      opts = filterPoseAutocollantTypeOptions(opts);
    }

    const isThicknessField = field.key === 'epaisseur';

    if (articleId === 'pkg-boite' && isGrammageField) {
      opts = opts.filter((g) => g === 'Grammage personnalisé' || (parseInt(g, 10) || 0) >= 300);
    }

    if (isGrammageField) {
      opts = filterThickPaperGrammageOptions(articleId, opts, field.key, articleCategory);
      opts = filterFlyerGrammageOptions(articleId, opts, articleCategory);
      const matForGrammage = String(
        config?.[parentFieldForGrammage(field.key)] ?? config?.matiere ?? '',
      ).trim();
      opts = filterGlossyGrammageOptions(matForGrammage, opts);
      if (isCalendarArticleId(articleId)) {
        opts = filterCalendarGrammageOptions(articleId, opts, field.key, matForGrammage);
      }
      if (opts.length > 1) {
        opts = sortGrammageChipOptions(opts);
      }
    }

    if (isMatiereField && opts.length > 1) {
      opts = sortMatiereChipOptions(opts);
    }

    // Format / dim : une seule option canonique par format (A5 ≠ A5 — 148×210 mm fusionnés)
    if ((field.key === 'format' || field.key === 'dim' || /format|dimension|taille/i.test(field.key))
      && !/grammage/i.test(field.key)
      && opts.length > 0) {
      const keepCm = isGrandFormatArticleId(articleId) || articleCategory === 'grand_format';
      opts = dedupeFormatOptions(opts, { keepCm });
    }

    // Chèque cadeau : retirer Offset / papiers fins des matières
    if (articleId === 'evt-cheque' && isMatiereField && opts.length) {
      opts = opts.filter((o) => isGiftCardMaterialAllowed(o).allowed);
    }

    // Quantités / couleurs / finitions : perso en fin ; paliers numériques croissants
    if (
      opts.length > 1
      && !isGrammageField
      && !isMatiereField
      && field.key !== 'format'
      && field.key !== 'dim'
      && (field.key === 'qty' || field.key === 'quantite' || field.key === 'pages'
        || field.key === 'couleur' || field.key === 'finition' || field.key === 'couverture'
        || /personnalis/i.test(opts.join(' ')))
    ) {
      opts = sortPOSOptions(field.key, opts);
    }

    if (field.key.startsWith('technologie') && config) {
      const matForTechno = String(
        config.matiere ?? config.matiere_feuillets ?? config.famille_papier ?? '',
      ).trim();
      const gramForTechno = String(
        config.grammage ?? config.grammage_feuillets ?? '',
      ).trim();
      opts = filterPrintTechnologyOptions(opts.length ? opts : (field.options ?? []), {
        matiere: matForTechno,
        grammage: gramForTechno,
        articleId,
      });
    }

    if (isLivresArticleId(articleId) && field.key === 'reliure' && config) {
      opts = filterLivresReliureOptions(opts, config);
    }

    const resolvedOptsRaw = resolveChipOptions(field.key, opts, adminChips ?? {});
    const matiereForLimit = config ? String(config.matiere ?? '').trim() : '';
    const resolvedOpts =
      field.key === 'format' && matiereForLimit
        ? resolvedOptsRaw.map((o) => {
            const check = isFormatAllowedForMaterial(matiereForLimit, o.label);
            if (check.allowed) return o;
            return {
              ...o,
              selectable: false,
              greyed: true,
              disabledReason: check.reason ?? 'Format non disponible pour cette matière',
            };
          })
        : resolvedOptsRaw;

    const isPaperWeight = isGrammageField;
    const isFilteredFormat = field.key === 'format' && Boolean(field.optionsFilter);
    const isFilteredHauteur = field.key === 'hauteur' && Boolean(field.optionsFilter);
    const isOriflammeHauteur = articleId === 'plv-oriflamme' && field.key === 'hauteur';
    const isPresentoirFormat = articleId === 'plv-presentoir-magasin' && field.key === 'format';
    const isBindingField =
      field.key === 'reliure' ||
      field.key === 'type_reliure' ||
      (articleId === 'fin-reliure' && field.key === 'type');
    const bindingPages = isBindingField && config ? parsePagesFromConfig(config) : null;
    const customKind = resolveCustomFieldKind(field);
    const isCustom = isCustomOptionValue(value);
    const customKey = `${field.key}_custom_detail`;
    const customNumberKey = `${field.key}_custom_number`;
    const customTextKey = `${field.key}_custom_text`;
    const isGrandFormatArticle = articleId.startsWith('gf-');
    const skipDynamicDims = SKIP_DYNAMIC_DIMENSION_ARTICLES.has(articleId) || isGrandFormatArticle;
    const showDimensions =
      shouldShowDimensionInputs(field, value, { skipDynamicDims, productConfig, articleId })
      && !shouldUseCustomFormatDimensionsPanel(articleId, productConfig ?? null, config ?? {});
    const skipFormatCustomText = isGrandFormatArticle && field.key === 'format';
    const showCustomFormatPanel =
      isCustomFormatChipField(field)
      && shouldUseCustomFormatDimensionsPanel(articleId, productConfig ?? null, config ?? {});
    const showTypedCustom = shouldShowTypedCustomBlock(field, value, {
      skipFormatCustomText,
      skipDynamicDims,
      productConfig,
      articleId,
      useCustomFormatPanel: showCustomFormatPanel,
    });
    const ui = customFieldUiCopy(customKind, field);
    const chipSize = compact ? POS_CHIP_SIZE.compact : POS_CHIP_SIZE.default;
    const labelGap = compact ? 'mb-1' : 'mb-1.5';
    const expandGap = compact ? 'mt-2' : 'mt-3';
    const doypackMatiereHint: Record<string, string> = {
      Kraft: 'Papier naturel',
      Alu: 'Barrière métallique',
      Plastique: 'Opaque & translucide',
    };
    return (
      <div>
        <PosFieldLabel articleId={articleId} field={field} className={labelGap} override={fieldOverride} />
        {opts.length === 0 && isPaperWeight ? (
          <p className="text-xs text-muted-foreground italic">{grammageEmptyPlaceholder(field)}</p>
        ) : opts.length === 0 && isThicknessField ? (
          <p className="text-xs text-muted-foreground italic">Sélectionnez une matière structure pour afficher les épaisseurs.</p>
        ) : opts.length === 0 && isFilteredFormat ? (
          <p className="text-xs text-muted-foreground italic">Sélectionnez un type pour afficher les formats compatibles.</p>
        ) : opts.length === 0 && isFilteredHauteur ? (
          <p className="text-xs text-muted-foreground italic">Sélectionnez un type d&apos;oriflamme pour afficher les hauteurs de support.</p>
        ) : (
        <div className="pos-chip-rail" role="listbox" aria-label={field.label}>
          {resolvedOpts.map(({ label: opt, selectable, greyed, ...rest }) => {
            const formatBlockedReason =
              'disabledReason' in rest && typeof (rest as { disabledReason?: string }).disabledReason === 'string'
                ? (rest as { disabledReason?: string }).disabledReason
                : undefined;
            const isLaizeField = field.key === 'laize' || field.key === 'laize_plaque';
            const isRupture = isGrandFormatArticle && isLaizeField && gfLaizeAvailability?.[opt] === false;
            const canSelect = selectable && !isRupture;
            const isForced = shouldShowForcedPriceWarning(field, opt, productConfig, articleId);
            const isFormatLike =
              field.key === 'format' || field.key === 'dim' || /format|dimension|taille/i.test(field.key);
            const isSelected =
              isFormatLike
                ? value === opt
                  || formatIdentityKey(String(value ?? '')) === formatIdentityKey(opt)
                  || displayFormatChipLabel(String(value ?? '')) === displayFormatChipLabel(opt)
                : value === opt;
            const formatChipPrimary = isFormatLike
              ? (extractIsoFormatCode(opt)
                ?? displayFormatChipLabel(opt, { withCommercialAlias: false, keepCm: isGrandFormatArticle }))
              : null;
            const formatChipFull = isFormatLike ? displayFormatChipLabel(opt) : null;
            const oriflammeVoile =
              isOriflammeHauteur && config?.type
                ? getOriflammeVoileLabel(String(config.type), opt)
                : null;
            const presentoirDims = isPresentoirFormat ? getPresentoirFormatChipSubtitle(opt) : null;
            const doypackHint =
              articleId === 'pkg-doypack' && isMatiereField ? doypackMatiereHint[opt] ?? null : null;
            const chipSubtitle = oriflammeVoile ?? presentoirDims ?? doypackHint;
            const bindingHint = isBindingField ? getBindingOptionHint(opt) : null;
            const metalBlocked =
              isBindingField &&
              opt === BINDING_LABELS.SPIRALE_METAL &&
              config &&
              !isMetalSpiralCompatible(config);
            const bindingOverCapacity =
              isBindingField &&
              config &&
              (metalBlocked ||
                (bindingPages != null &&
                  bindingPages > 0 &&
                  !evaluateBinding(opt, config).compatible));
            const bindingGreyed = greyed || bindingOverCapacity;
            const grammageTooLight =
              isGrammageField
              && isGrammageBelowMinimum(articleId, opt, field.key, articleCategory);
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={!canSelect || bindingOverCapacity || grammageTooLight}
                title={
                  formatBlockedReason
                    ? formatBlockedReason
                    : metalBlocked
                    ? 'Spirale métallique indisponible : volume trop important (max 16 mm).'
                    : grammageTooLight
                    ? getMinGrammageHint(articleId, field.key, articleCategory)
                    : formatChipFull
                      ?? oriflammeVoile
                      ?? presentoirDims
                      ?? doypackHint
                      ?? bindingHint
                      ?? undefined
                }
                onClick={() => canSelect && !bindingOverCapacity && !grammageTooLight && onChipSelect(field, opt)}
                className={`${chipSize} ${posChipClassName({
                  selected: isSelected,
                  disabled: !canSelect || bindingOverCapacity || grammageTooLight,
                  greyed: bindingGreyed || isRupture || grammageTooLight,
                })} ${chipSubtitle || bindingHint ? 'pos-chip--with-sub' : ''}`}
              >
                <span className="pos-chip__label">{formatChipPrimary ?? opt}</span>
                {chipSubtitle && (
                  <span className={`block text-[9px] font-normal mt-0.5 leading-tight ${isSelected ? 'text-white/75' : 'text-muted-foreground/90'}`}>
                    {chipSubtitle}
                  </span>
                )}
                {!chipSubtitle && bindingHint && (
                  <span className={`block text-[9px] font-normal mt-0.5 leading-tight ${isSelected ? 'text-white/75' : 'text-muted-foreground/90'}`}>
                    {bindingHint}
                  </span>
                )}
                {isRupture && <span className="ml-1 text-[9px] opacity-70">rupture</span>}
                {isForced && isSelected && <span className="ml-1 text-[9px] opacity-70">💰</span>}
              </button>
            );
          })}
        </div>
        )}
        {isForcedPrice && <p className="orion-text-meta font-semibold text-[#F59E0B] mt-1.5">⚠ Prix forcé obligatoire pour cette option</p>}
        {isOriflammeHauteur && value && config?.type && getOriflammeVoileDetail(String(config.type), String(value)) && (
          <p className="orion-text-meta font-medium">
            📐 {getOriflammeVoileDetail(String(config.type), String(value))}
          </p>
        )}
        {isPresentoirFormat && value && getPresentoirFormatDetail(String(value)) && (
          <p className="orion-text-meta font-medium">
            📐 {getPresentoirFormatDetail(String(value))}
          </p>
        )}
        {isBindingField && value && config && (
          <BindingTechnicalRecommendation
            config={config}
            bindingLabel={String(value)}
            compact
            className="mt-2"
          />
        )}
        {field.note && <p className="orion-text-meta mt-1.5 italic">ℹ {field.note}</p>}
        {isLivresArticleId(articleId) && field.key === 'pages' && config && livresSaddleStitchPagesHint(config) ? (
          <p className="orion-text-meta text-amber-700 dark:text-amber-400 mt-1.5">{livresSaddleStitchPagesHint(config)}</p>
        ) : null}
        {isLivresArticleId(articleId) &&
        (field.key === 'pages_noir' || field.key === 'pages_quadri') &&
        config &&
        validateLivresMixtePages(config) ? (
          <p className="orion-text-meta text-amber-700 dark:text-amber-400 mt-1.5">{validateLivresMixtePages(config)}</p>
        ) : null}
        {showTypedCustom && (customKind === 'quantity' || customKind === 'grammage') && (
          <div className={`${expandGap} bg-accent/50 rounded-lg p-3 border border-border space-y-2`}>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <label className="orion-text-label text-primary">{ui.title}</label>
              <PosFieldPriceImpactBadge articleId={articleId} field={field} override={fieldOverride} />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground">{ui.inputLabel}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  value={config?.[customNumberKey] || ''}
                  onChange={(e) => updateConfig?.(customNumberKey, e.target.value)}
                  className="w-full bg-background rounded-lg px-2 py-1.5 text-xs font-mono outline-none"
                  placeholder={ui.inputPlaceholder}
                />
                {ui.suffix && <span className="text-[9px] text-muted-foreground whitespace-nowrap">{ui.suffix}</span>}
              </div>
            </div>
            <textarea
              value={config?.[customKey] || ''}
              onChange={(e) => updateConfig?.(customKey, e.target.value)}
              placeholder={ui.detailPlaceholder}
              className="w-full bg-background rounded-lg px-3 py-2 text-xs outline-none  min-h-[40px] resize-y"
            />
          </div>
        )}
        {showTypedCustom && customKind !== 'quantity' && customKind !== 'grammage' && (
          <div className={`${expandGap} bg-accent/50 rounded-lg p-3 border border-border space-y-2`}>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <label className="orion-text-label text-primary">{ui.title}</label>
              <PosFieldPriceImpactBadge articleId={articleId} field={field} override={fieldOverride} />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground">{ui.inputLabel}</label>
              <input
                type="text"
                value={config?.[customTextKey] || ''}
                onChange={(e) => updateConfig?.(customTextKey, e.target.value)}
                placeholder={ui.inputPlaceholder}
                className="w-full bg-background rounded-lg px-3 py-2 text-xs outline-none "
              />
            </div>
            <textarea
              value={config?.[customKey] || ''}
              onChange={(e) => updateConfig?.(customKey, e.target.value)}
              placeholder={ui.detailPlaceholder}
              className="w-full bg-background rounded-lg px-3 py-2 text-xs outline-none  min-h-[40px] resize-y"
            />
          </div>
        )}
        {showCustomFormatPanel && productConfig && updateConfig && (
          <CustomFormatDimensionsPanel
            productConfig={productConfig}
            config={config ?? {}}
            updateConfig={updateConfig}
            formatFieldKey={field.key}
          />
        )}
        {showDimensions && (
          <div className={`${expandGap} bg-accent/50 rounded-lg p-3 border border-border space-y-2`}>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <label className="orion-text-label text-primary">{ui.title}</label>
              <PosFieldPriceImpactBadge articleId={articleId} field={field} override={fieldOverride} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-muted-foreground">Longueur L</label>
                <div className="flex items-center gap-1">
                  <input type="number" min={1} value={config?.longueur ?? config?.[`${field.key}_largeur`] ?? ''} onChange={e => updateConfig?.('longueur', e.target.value)} className="w-full bg-background rounded-lg px-2 py-1.5 text-xs font-mono outline-none " placeholder="0" />
                  <span className="text-[9px] text-muted-foreground">mm</span>
                </div>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">Largeur l</label>
                <div className="flex items-center gap-1">
                  <input type="number" min={1} value={config?.largeur ?? config?.[`${field.key}_hauteur`] ?? ''} onChange={e => updateConfig?.('largeur', e.target.value)} className="w-full bg-background rounded-lg px-2 py-1.5 text-xs font-mono outline-none " placeholder="0" />
                  <span className="text-[9px] text-muted-foreground">mm</span>
                </div>
              </div>
            </div>
            {buildGeneratedFormatLabel(config ?? {}) ? (
              <p className="orion-text-meta font-medium">
                Format : {buildGeneratedFormatLabel(config ?? {})}
              </p>
            ) : null}
            <textarea
              value={config?.[customKey] || ''}
              onChange={(e) => updateConfig?.(customKey, e.target.value)}
              placeholder={ui.detailPlaceholder}
              className="w-full bg-background rounded-lg px-3 py-2 text-xs outline-none  min-h-[40px] resize-y"
            />
          </div>
        )}
      </div>
    );
  }

  if (field.type === 'chips_multi') {
    if (field.key === 'couleurs_souches' && isAutocopiantArticleId(articleId)) {
      const selected = Array.isArray(value) ? value : [];
      const maxColors = resolveAutocopiantColorCount(config ?? {});
      return (
        <AutocopiantSoucheColors
          selected={selected}
          maxColors={maxColors}
          onChange={(next) => onChange(next)}
          compact={compact}
        />
      );
    }

    const selected = Array.isArray(value) ? value : [];
    const resolvedOpts = resolveChipOptions(field.key, field.options ?? [], adminChips ?? {});
    const chipSize = compact ? POS_CHIP_SIZE.compact : POS_CHIP_SIZE.default;
    const labelGap = compact ? 'mb-1' : 'mb-1.5';
    const multiHint = formatMultiSelectionProgress(field, selected);
    return (
      <div>
        <PosFieldLabel
          articleId={articleId}
          field={field}
          className={`justify-between gap-2 ${labelGap}`}
          override={fieldOverride}
          hint={
            multiHint ? (
              <span className="text-[9px] font-mono text-primary shrink-0 ml-auto">{multiHint}</span>
            ) : undefined
          }
        />
        <div className="pos-chip-rail" role="listbox" aria-label={field.label}>
          {resolvedOpts.map(({ label: opt, selectable, greyed }) => {
            const isSel = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                disabled={!selectable}
                aria-pressed={isSel}
                onClick={() => selectable && onChipSelect(field, opt)}
                className={`${chipSize} ${posChipClassName({ selected: isSel, disabled: !selectable, greyed })}`}
              >
                {isSel && <Check size={10} className="inline mr-1" />}
                {opt}
              </button>
            );
          })}
        </div>
        {selected.length === 0 && (
          <p className="text-[9px] text-muted-foreground mt-1.5">
            Cliquez pour sélectionner — second clic pour désélectionner
          </p>
        )}
      </div>
    );
  }

  if (field.type === 'number') {
    const minVal = field.min ?? 1;
    const isGfCmDim =
      field.suffix === 'cm' ||
      field.key.endsWith('_cm') ||
      field.key === 'longueur_cm' ||
      field.key === 'largeur_cm' ||
      field.key === 'hauteur_cm';
    const step = field.key.includes('pose') ? 0.01 : isGfCmDim ? 1 : 1;
    const hasValue = value !== '' && value !== undefined && value !== null;
    const parsed = hasValue ? Number(value) : NaN;
    const numVal = Number.isFinite(parsed) ? parsed : minVal;
    /** Affichage libre : ne pas forcer le min pendant la frappe */
    const displayValue = !hasValue
      ? ''
      : typeof value === 'string'
        ? value
        : Number.isFinite(parsed)
          ? parsed
          : '';
    const isPoseDim =
      articleId === 'fin-autocollant' &&
      (field.key === 'longueur_pose' || field.key === 'largeur_pose');
    const poseL = parseFloat(String(config?.longueur_pose ?? 0)) || 0;
    const poseW = parseFloat(String(config?.largeur_pose ?? 0)) || 0;
    const poseQty = Number(config?.qty) || 1;
    const poseUnitM2 = isPoseDim && poseL > 0 && poseW > 0 ? computeSurfaceM2(poseL, poseW) : 0;
    const poseTotalM2 = Math.round(poseUnitM2 * poseQty * 100) / 100;
    const isReliurePages = articleId === 'fin-reliure' && field.key === 'nb_pages';
    const docPages = isReliurePages && Number.isFinite(parsed) ? parsed : null;
    const physicalSheets =
      docPages != null
        ? (printModeFromConfig(config ?? {}) === 'recto_verso'
            ? Math.ceil(docPages / 2)
            : docPages)
        : null;

    const belowMin = hasValue && Number.isFinite(parsed) && parsed < minVal;
    const unitLabel = field.suffix ? ` ${field.suffix}` : '';

    const commitNumber = (raw: string) => {
      if (raw === '') {
        onChange('');
        return;
      }
      // Décimales en cours de frappe (ex. "12.")
      if (step < 1 && /^-?\d+\.$/.test(raw)) {
        onChange(raw);
        return;
      }
      const n = Number(raw);
      if (!Number.isFinite(n)) return;
      onChange(n);
    };

    const clampOnBlur = () => {
      if (value === '' || value === undefined || value === null) return;
      const n = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(n)) {
        onChange('');
        return;
      }
      const clamped = Math.max(minVal, step < 1 ? Math.round(n * 100) / 100 : Math.round(n));
      if (clamped !== n) onChange(clamped);
    };

    const isQtyField = field.key === 'quantite' || field.key === 'qty';
    const showPresets = Boolean(field.presets || isQtyField);

    return (
      <div className={isQtyField ? 'pos-qty-field' : undefined}>
        <PosFieldLabel articleId={articleId} field={field} className="mb-1.5" override={fieldOverride} />
        <div className={`pos-qty-stepper ${belowMin ? 'is-warn' : ''}`}>
          <button
            type="button"
            tabIndex={-1}
            data-orion-stepper="1"
            onClick={() => onChange(Math.max(minVal, Math.round((numVal - step) * 100) / 100))}
            className="pos-qty-stepper__btn"
            aria-label="Diminuer"
          >
            <Minus size={15} strokeWidth={2.25} />
          </button>
          <input
            type="number"
            step={String(step)}
            inputMode="decimal"
            value={displayValue}
            placeholder={String(minVal)}
            aria-invalid={belowMin || undefined}
            aria-describedby={belowMin ? `pos-field-alert-${field.key}` : undefined}
            onChange={(e) => commitNumber(e.target.value)}
            onBlur={clampOnBlur}
            className="pos-qty-stepper__input"
          />
          {field.suffix && <span className="pos-qty-stepper__suffix">{field.suffix}</span>}
          <button
            type="button"
            tabIndex={-1}
            data-orion-stepper="1"
            onClick={() => onChange(hasValue && Number.isFinite(parsed)
              ? Math.round((numVal + step) * 100) / 100
              : minVal)}
            className="pos-qty-stepper__btn"
            aria-label="Augmenter"
          >
            <Plus size={15} strokeWidth={2.25} />
          </button>
        </div>
        {belowMin && (
          <p id={`pos-field-alert-${field.key}`} className="orion-field-alert" role="alert">
            Minimum : {minVal}{unitLabel}
          </p>
        )}
        {isReliurePages && physicalSheets != null && docPages != null && (
          <p className="orion-text-meta font-medium">
            Feuilles physiques calculées : {physicalSheets} feuille{physicalSheets > 1 ? 's' : ''}
            {' '}({printModeFromConfig(config ?? {}) === 'recto_verso' ? 'Recto-Verso' : 'Recto'})
          </p>
        )}
        {isPoseDim && isPoseGrandFormat(String(config?.type ?? '')) && poseUnitM2 > 0 && (
          <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 orion-text-meta space-y-0.5">
            <p>Surface unitaire : <span className="font-bold text-foreground">{poseUnitM2.toFixed(2)} m²</span></p>
            <p>Surface totale : <span className="font-bold text-accent-brand">{poseTotalM2.toFixed(2)} m²</span> × quantité</p>
            {String(config?.hauteur_pose ?? '').includes('Plus de 3') && (
              <p className="text-[#F59E0B] font-medium">Équipement spécial requis pour cette pose.</p>
            )}
          </div>
        )}
        {field.key === 'format_eq_largeur' && (() => {
          const surf = surfaceM2FromFormatEqMm(
            config?.format_eq_longueur,
            config?.format_eq_largeur,
          );
          if (surf == null || !(surf > 0)) {
            return (
              <p className="orion-text-meta mt-1.5 italic">
                Surface auto : saisissez longueur × largeur (mm)
              </p>
            );
          }
          const eq = surfaceToA4Equivalent(surf, 'exact');
          return (
            <div className="mt-2 rounded-[7px] border border-border/60 bg-muted/30 px-3 py-2 orion-text-meta space-y-0.5">
              <p>
                Surface tarif :{' '}
                <span className="font-bold text-foreground">{surf.toFixed(4)} m²</span>
              </p>
              <p>
                Équiv. A4 auto :{' '}
                <span className="font-bold text-accent-brand">{eq.formatEquivalent}</span>
                {' '}({eq.equivA4}×A4)
              </p>
            </div>
          );
        })()}
        {showPresets && (
          <div className="pos-qty-presets" role="group" aria-label="Quantités rapides">
            {(field.presets || getQuickQtys(minVal)).map((q: number) => {
              const isSelected = hasValue && Number.isFinite(parsed) && numVal === q;
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => onChange(q)}
                  className={`pos-qty-presets__chip ${isSelected ? 'is-selected' : ''}`}
                  aria-pressed={isSelected}
                >
                  {q}
                </button>
              );
            })}
          </div>
        )}
        {field.note && <p className="orion-text-meta mt-1.5 italic">ℹ {field.note}</p>}
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className="pos-field-textarea">
        <PosFieldLabel articleId={articleId} field={field} className="mb-1.5" override={fieldOverride} />
        <textarea
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Instructions spéciales, références, détails..."
          className="pos-field-textarea__input w-full bg-accent rounded-[7px] px-3 py-2.5 text-[11px] outline-none  resize-none"
        />
      </div>
    );
  }

  return null;
}

// ═════ Helpers ═════

function getQuickQtys(minVal: number): number[] {
  const candidates = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000];
  return candidates.filter((q) => q >= minVal).slice(0, 5);
}

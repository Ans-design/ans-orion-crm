'use client';

import { Info } from 'lucide-react';
import { formatPrice } from '@/lib/data/catalogue';
import type { CatalogueItem } from '@/lib/data/catalogue';
import type { ProductConfig } from '@/lib/data/config-types';
import { PosMissingFieldsBanner } from '@/components/pos/pos-missing-fields-banner';
import { PosConfigurationSummary } from '@/components/pos/pos-configuration-summary';
import { ProductPricingPanel } from '@/components/pos/product-pricing-panel';
import { AddToCartActionBar } from '@/components/pos/add-to-cart-action-bar';
import { BindingTechnicalRecommendation } from '@/components/pos/binding-technical-recommendation';
import { BacheTechnicalPanel } from '@/components/pos/bache-technical-panel';
import { articleUsesBindingEngine } from '@/lib/print/binding-rules';
import { isBacheArticleId } from '@/lib/pos/bache-catalog';
import type { StockCheckResult } from '@/lib/services/StockAvailabilityService';
import type { PackagingSurfaceResult } from '@/lib/data/packaging-surface';
import type { GrandFormatBillableResult } from '@/lib/grand-format/types';

export type PosMarginInsight = {
  unitCostEst: number;
  marginAmount: number;
  marginRatePct: number;
  costSource: string | null;
};

export type PosPriceCalc = {
  prixUnit: number;
  sousTotal: number;
  remiseRate: number;
  remiseAmount: number;
  totalHT: number;
  clicheFee: number;
  qty: number;
  calculable: boolean;
  appliedTier?: {
    label: string;
    unitPrice: number;
    source: string;
  } | null;
  formulaVersion?: number | string | null;
  /** Message métier (ex. format tampon supérieur facturé) */
  pricingNote?: string | null;
  /** Détail Flyer = ISF + pliage */
  flyerBreakdown?: {
    prixImpressionUnitaire: number;
    prixPliageUnitaire: number;
    nombrePlis: number;
  } | null;
  /** Détail Carterie = grille PRIX 2026 ou feuille ÷ pièces + découpe */
  carterieBreakdown?: {
    pricingMode?: 'excel_grid' | 'isf_imposition';
    gridColumnLabel?: string | null;
    gridTierLabel?: string | null;
    prixImpressionFeuille: number;
    prixFinitionsFeuille: number;
    piecesParFeuille: number;
    prixParPieceAvantDecoupe: number;
    prixDecoupeParPiece: number;
    finitionsDetail?: Array<{ label: string; amount: number }>;
  } | null;
  /** Détail publications (livres / bloc-notes / calendriers) */
  publicationBreakdown?: {
    prixInterieur: number;
    prixCouverture: number;
    prixReliure: number;
    prixFinitions: number;
    pages: number;
    feuillesPhysiques: number;
    nombreCouverture?: number;
    reliureLabel?: string;
  } | null;
  /** Détail packaging boîte = ISF + finitions + marges */
  packagingBreakdown?: {
    formatEquivalent: string;
    equivA4: number;
    surfaceTheoriqueM2: number;
    surfaceAvecDechetsM2: number;
    margeDechetsPct: number;
    prixImpressionBrut: number;
    prixDechetsMatiere: number;
    prixImpressionAvecDechets: number;
    finitionLines: Array<{ label: string; amount: number }>;
    prixFinitions: number;
    prixFaconnage: number;
    sousTotalDepenses: number;
    beneficePct: number;
    benefice: number;
    margeDepensePct: number;
    margeDepense: number;
  } | null;
};

import type { CalendarMaterialRecap } from '@/lib/calendar/material-recap';
import type { BlocNoteMaterialRecap } from '@/lib/pos/bloc-note-material-recap';
import type { PlvMaterialRecap } from '@/lib/pos/plv-material-recap';
import type { LivresMaterialRecap } from '@/lib/pos/livres-material-recap';
import type { CustomSurfaceRecap } from '@/lib/pos/custom-surface-recap';

export type PosCalendarRecap = CalendarMaterialRecap | null;

export type PosBoxSurface = PackagingSurfaceResult | null;

export type PosGrandFormatM2 = {
  largeur: number;
  hauteur: number;
  m2: number;
} | null;

export type PosGfBillable = GrandFormatBillableResult | null;

export type PosSummaryContentProps = {
  article: CatalogueItem;
  config: Record<string, unknown>;
  updateConfig: (key: string, value: unknown) => void;
  productConfig: ProductConfig | null;
  stockInfo: StockCheckResult | null;
  isReady: boolean;
  /** false si rupture stock bloque l'ajout (hors override bâche) */
  canAddToCart?: boolean;
  canCreateQuoteDraft?: boolean;
  quoteDraftLoading?: boolean;
  pricePending?: boolean;
  priceReady?: boolean;
  priceLoading?: boolean;
  priceError?: string | null;
  cartBlockReason?: string | null;
  completion: { done: number; total: number; pct: number };
  boxSurface: PosBoxSurface;
  calendarRecap?: PosCalendarRecap;
  blocNoteRecap?: BlocNoteMaterialRecap | null;
  plvRecap?: PlvMaterialRecap | null;
  livresRecap?: LivresMaterialRecap | null;
  customSurfaceRecap?: CustomSurfaceRecap | null;
  grandFormatM2: PosGrandFormatM2;
  gfBillable?: PosGfBillable;
  priceCalc: PosPriceCalc;
  marginInsight?: PosMarginInsight | null;
  showMargin?: boolean;
  onAddToCart: () => void;
  onCreateDevis: () => void;
  onCreateQuoteDraft?: () => void;
  onReset: () => void;
  showActions?: boolean;
  /** Mode édition depuis le panier */
  editMode?: boolean;
  onCancelEdit?: () => void;
  /** Masque le bloc surface GF dupliqué (ex. bâche avec panel dédié) */
  hideGfSurfaceBlock?: boolean;
  /** Prix m² bâche pour le récap surface (colonne résumé) */
  bachePrixM2?: number | null;
  /** Scroll vers un champ du formulaire (champs manquants) */
  onFocusField?: (fieldKey: string) => void;
};

export function PosSummaryContent({
  article,
  config,
  updateConfig,
  productConfig,
  stockInfo,
  isReady,
  canAddToCart: canAddToCartProp,
  canCreateQuoteDraft = false,
  quoteDraftLoading = false,
  pricePending = false,
  priceReady = true,
  priceLoading = false,
  priceError = null,
  cartBlockReason = null,
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
  marginInsight,
  showMargin = false,
  onAddToCart,
  onCreateDevis,
  onCreateQuoteDraft,
  onReset,
  showActions = true,
  editMode = false,
  onCancelEdit,
  hideGfSurfaceBlock = false,
  bachePrixM2 = null,
  onFocusField,
}: PosSummaryContentProps) {
  const isPackaging =
    article?.category?.includes('packaging') || article?.id?.includes('boite');
  const isBache = isBacheArticleId(article?.id ?? '');
  const canAddToCart = canAddToCartProp ?? isReady;
  const hasForcedPrice =
    Boolean(config._prix_force) && parseFloat(String(config._prix_force)) > 0;
  const showPrice = priceCalc.calculable || hasForcedPrice;
  const showPriceLoading = !showPrice && priceLoading;
  const hasTechnicalExtras = Boolean(
    calendarRecap ||
      blocNoteRecap ||
      plvRecap ||
      livresRecap ||
      customSurfaceRecap ||
      (isPackaging && boxSurface) ||
      isBache ||
      (!hideGfSurfaceBlock && (gfBillable || grandFormatM2)) ||
      articleUsesBindingEngine(article.id ?? ''),
  );
  const openTechByDefault = isBache || Boolean(gfBillable || grandFormatM2);

  return (
    <div className="pos-summary-stack">
    <div className="pos-summary-soft">
      <div className="pos-summary-soft__hero">
        <p className="pos-summary-soft__label">Prix estimé</p>
        <div className="pos-summary-soft__price">
          {showPrice ? (
            <>
              {formatPrice(priceCalc.totalHT)}
              <span className="pos-summary-soft__currency">Ar</span>
            </>
          ) : showPriceLoading ? (
            <>
              <span className="pos-summary-soft__price-pending" aria-busy="true">
                …
              </span>
              <span className="pos-summary-soft__currency">Ar</span>
            </>
          ) : (
            <>
              <span className="pos-summary-soft__price-pending">—</span>
              <span className="pos-summary-soft__currency">Ar</span>
            </>
          )}
        </div>
        <p className="pos-summary-soft__hero-meta">
          {completion.pct}% configuré · {completion.done}/{completion.total} champs
        </p>
        <div className="pos-summary-soft__hero-bar" aria-hidden>
          <div
            className={`pos-summary-soft__hero-fill ${completion.pct >= 100 ? 'is-done' : ''}`}
            style={{ width: `${completion.pct}%` }}
          />
        </div>
      </div>

      <div className="pos-summary-soft__body">
        <PosMissingFieldsBanner
          productConfig={productConfig}
          config={config}
          isReady={isReady}
          priceReady={priceReady}
          priceLoading={priceLoading}
          priceError={priceError}
          completion={completion}
          onFocusField={onFocusField}
        />

        {stockInfo && stockInfo.status !== 'UNKNOWN' && (
          <div
            className={`pos-soft-alert ${
              stockInfo.status === 'AVAILABLE'
                ? 'pos-soft-alert--ok'
                : stockInfo.status === 'LOW_STOCK'
                  ? 'pos-soft-alert--warn'
                  : 'pos-soft-alert--danger'
            }`}
          >
            <span className="pos-soft-alert__text">{stockInfo.message}</span>
          </div>
        )}
        {stockInfo?.status === 'UNKNOWN' && (
          <div className="pos-soft-alert pos-soft-alert--warn">
            <span className="pos-soft-alert__text">{stockInfo.message}</span>
          </div>
        )}

        <PosConfigurationSummary
          article={article}
          config={config}
          productConfig={productConfig}
          priceCalc={priceCalc}
          grandFormatM2={grandFormatM2}
        />

        <ProductPricingPanel
          priceCalc={priceCalc}
          config={config}
          updateConfig={updateConfig}
          marginInsight={marginInsight}
          showMargin={showMargin}
          // Soft-refresh : ne pas flasher « recalcul… » si un prix est déjà affiché
          pricePending={pricePending || (priceLoading && !showPrice)}
        />

        <p className="pos-summary-soft__status-note">
          {completion.pct >= 100
            ? 'Tous les champs obligatoires sont renseignés. Vous pouvez ajouter au panier.'
            : `Il reste ${Math.max(0, completion.total - completion.done)} champ${completion.total - completion.done > 1 ? 's' : ''} obligatoire${completion.total - completion.done > 1 ? 's' : ''} avant de finaliser le tarif.`}
        </p>
      </div>

      {showActions && (
        <div className="pos-summary-soft__actions">
          <AddToCartActionBar
            canAddToCart={canAddToCart}
            canCreateQuoteDraft={canCreateQuoteDraft}
            quoteDraftLoading={quoteDraftLoading}
            disabledReason={cartBlockReason}
            quoteDraftReason={
              canCreateQuoteDraft
                ? 'Configuration enregistrée — le commercial finalisera le tarif.'
                : null
            }
            completion={completion}
            pricePending={pricePending}
            editMode={editMode}
            onAddToCart={onAddToCart}
            onCreateDevis={onCreateDevis}
            onCreateQuoteDraft={onCreateQuoteDraft}
            onReset={onReset}
            onCancelEdit={onCancelEdit}
          />
        </div>
      )}

    </div>

      {hasTechnicalExtras && (
        <details className="pos-tech-panel" open={openTechByDefault || undefined}>
          <summary className="pos-tech-panel__summary">
            <span className="pos-tech-panel__summary-title">Détails techniques & matière</span>
          </summary>
          <div className="pos-tech-panel__body">
            {isBache && (
              <BacheTechnicalPanel
                config={config}
                prixM2={bachePrixM2}
                placement="summary"
                updateConfig={updateConfig}
              />
            )}
            {articleUsesBindingEngine(article.id ?? '') && (
              <BindingTechnicalRecommendation config={config} className="pos-tech-inline mt-0" />
            )}

      {calendarRecap ? (
        <section className="pos-tech-block">
          <header className="pos-tech-block__head">
            <h3 className="pos-tech-block__title">Récapitulatif matière</h3>
            <span className="pos-tech-block__badge">Calendrier</span>
          </header>
          {calendarRecap.incomplete ? (
            <p className="pos-tech-note text-amber-700 dark:text-amber-400">
              {calendarRecap.alert ?? 'Complétez le format pour le calcul matière détaillé.'}
            </p>
          ) : null}
          <div className="pos-tech-dl">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Format</span>
              <span className="font-mono font-semibold text-right">{calendarRecap.formatLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Dimensions</span>
              <span className="font-mono font-semibold text-right">{calendarRecap.formatDeveloppe}</span>
            </div>
            {calendarRecap.material ? (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Matière</span>
                <span className="font-semibold text-right">{calendarRecap.material} {calendarRecap.grammage}</span>
              </div>
            ) : null}
            {calendarRecap.sheetCount > 1 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Feuillets</span>
                <span className="font-mono">{calendarRecap.sheetCount}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface réelle unit.</span>
              <span className="font-mono">{calendarRecap.realSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface brute unit.</span>
              <span className="font-mono font-bold text-[#FF174D]">{calendarRecap.grossSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface brute totale</span>
              <span className="font-mono font-bold">{calendarRecap.totalGrossSurfaceM2} m²</span>
            </div>
            {calendarRecap.supportSurfaceM2 != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Surface support</span>
                <span className="font-mono">{calendarRecap.supportSurfaceM2} m²</span>
              </div>
            ) : null}
            {calendarRecap.sheetsSurfaceM2 != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Surface feuillets</span>
                <span className="font-mono">{calendarRecap.sheetsSurfaceM2} m²</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impression</span>
              <span className="font-mono">{calendarRecap.printMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Marge matière</span>
              <span className="font-mono text-[10px]">{calendarRecap.margeRule}</span>
            </div>
            {calendarRecap.alert ? (
              <p className="pos-tech-note text-amber-700 dark:text-amber-400">{calendarRecap.alert}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {blocNoteRecap ? (
        <section className="pos-tech-block">
          <header className="pos-tech-block__head">
            <h3 className="pos-tech-block__title">Récapitulatif matière</h3>
            <span className="pos-tech-block__badge">Bloc-note & Agenda</span>
          </header>
          {blocNoteRecap.incomplete ? (
            <p className="pos-tech-note text-amber-700 dark:text-amber-400">
              Complétez le format et le nombre de feuilles pour le calcul matière détaillé.
            </p>
          ) : null}
          <div className="pos-tech-dl">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Article</span>
              <span className="font-semibold text-right">{blocNoteRecap.produitLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Format</span>
              <span className="font-mono font-semibold text-right">{blocNoteRecap.formatLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Dimensions</span>
              <span className="font-mono font-semibold text-right">{blocNoteRecap.dimensionsLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Type support tarif</span>
              <span className="font-semibold text-right">{blocNoteRecap.typeSupportTarif}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Couverture</span>
              <span className="font-semibold text-right">{blocNoteRecap.matiereCouverture}</span>
            </div>
            {blocNoteRecap.hasPvcTranslucide ? (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">PVC translucide</span>
                <span className="font-semibold text-right">Oui</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Grammage couverture</span>
              <span className="font-mono text-right">{blocNoteRecap.grammageCouverture}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Matière intérieure</span>
              <span className="font-semibold text-right">
                {blocNoteRecap.matiereInterieure} {blocNoteRecap.grammageInterieur}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nombre de feuilles</span>
              <span className="font-mono">{blocNoteRecap.sheetCount}</span>
            </div>
            {blocNoteRecap.pageCount !== blocNoteRecap.sheetCount ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre de pages</span>
                <span className="font-mono">{blocNoteRecap.pageCount}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Impression intérieure</span>
              <span className="font-mono text-right">{blocNoteRecap.impressionInterieur}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Impression couverture</span>
              <span className="font-mono text-right">{blocNoteRecap.impressionCouverture}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Finition / pelliculage</span>
              <span className="font-semibold text-right">{blocNoteRecap.finitionPelliculage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface couverture</span>
              <span className="font-mono">{blocNoteRecap.coverSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface intérieure</span>
              <span className="font-mono">{blocNoteRecap.interiorSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface brute totale</span>
              <span className="font-mono font-bold text-[#FF174D]">{blocNoteRecap.totalGrossSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Stock consommé</span>
              <span className="font-mono text-[10px] text-right">{blocNoteRecap.stockSummary}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Épaisseur estimée</span>
              <span className="font-mono">{blocNoteRecap.blockThicknessMm} mm</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Reliure / assemblage</span>
              <span className="font-semibold text-right">{blocNoteRecap.bindingLabel}</span>
            </div>
            {blocNoteRecap.bindingDetail ? (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Détail reliure</span>
                <span className="font-mono text-[10px] text-right">{blocNoteRecap.bindingDetail}</span>
              </div>
            ) : null}
            {blocNoteRecap.prixCalculable && blocNoteRecap.prixUnitaire != null ? (
              <div className="flex justify-between pt-1 border-t border-[#EEF2F7] dark:border-border/40">
                <span className="text-muted-foreground">Prix automatique unit.</span>
                <span className="font-mono font-bold">{formatPrice(blocNoteRecap.prixUnitaire)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Marge matière</span>
              <span className="font-mono text-[10px] text-right">{blocNoteRecap.margeRule}</span>
            </div>
          </div>
        </section>
      ) : null}

      {plvRecap ? (
        <section className="pos-tech-block">
          <header className="pos-tech-block__head">
            <h3 className="pos-tech-block__title">Récapitulatif matière</h3>
            <span className="pos-tech-block__badge">PLV</span>
          </header>
          {plvRecap.incomplete ? (
            <p className="pos-tech-note text-amber-700 dark:text-amber-400">
              Complétez le format et les dimensions pour le calcul matière détaillé.
            </p>
          ) : null}
          <div className="pos-tech-dl">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Format</span>
              <span className="font-semibold text-right">{plvRecap.formatLabel}</span>
            </div>
            {plvRecap.widthMm != null ? (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Dimensions</span>
                <span className="font-mono text-right">
                  {plvRecap.widthMm}×{plvRecap.heightMm}
                  {plvRecap.depthMm != null ? `×${plvRecap.depthMm}` : ''} mm
                </span>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Matière</span>
              <span className="font-semibold text-right">{plvRecap.matiere} {plvRecap.epaisseur !== '—' ? plvRecap.epaisseur : ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantité</span>
              <span className="font-mono">{plvRecap.qty}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface réelle</span>
              <span className="font-mono">{plvRecap.realSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface brute</span>
              <span className="font-mono font-bold text-[#FF174D]">{plvRecap.grossSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface brute totale</span>
              <span className="font-mono font-bold">{plvRecap.totalGrossSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Support / type</span>
              <span className="text-right">{plvRecap.support}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Impression</span>
              <span className="font-mono text-right">{plvRecap.impression}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Finition</span>
              <span className="text-right">{plvRecap.finition}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Façonnage</span>
              <span className="font-mono text-[10px] text-right">{plvRecap.façonnage}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Stock consommé</span>
              <span className="font-mono text-[10px] text-right">{plvRecap.stockSummary}</span>
            </div>
            {plvRecap.prixMatiere != null ? (
              <div className="flex justify-between pt-1 border-t border-[#EEF2F7] dark:border-border/40">
                <span className="text-muted-foreground">Prix matière (est.)</span>
                <span className="font-mono">{formatPrice(plvRecap.prixMatiere)}</span>
              </div>
            ) : null}
            {plvRecap.prixImpression != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix impression (est.)</span>
                <span className="font-mono">{formatPrice(plvRecap.prixImpression)}</span>
              </div>
            ) : null}
            {plvRecap.prixFinition != null && plvRecap.prixFinition > 0 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix finition (est.)</span>
                <span className="font-mono">{formatPrice(plvRecap.prixFinition)}</span>
              </div>
            ) : null}
            {plvRecap.prixFaçonnage != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix façonnage (est.)</span>
                <span className="font-mono">{formatPrice(plvRecap.prixFaçonnage)}</span>
              </div>
            ) : null}
            {plvRecap.prixCalculable && plvRecap.prixUnitaire != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix automatique unit.</span>
                <span className="font-mono font-bold">{formatPrice(plvRecap.prixUnitaire)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Marge matière</span>
              <span className="font-mono text-[10px] text-right">{plvRecap.margeRule}</span>
            </div>
          </div>
        </section>
      ) : null}

      {livresRecap ? (
        <section className="pos-tech-block">
          <header className="pos-tech-block__head">
            <h3 className="pos-tech-block__title">Récapitulatif matière</h3>
            <span className="pos-tech-block__badge">Livres & publications</span>
          </header>
          {livresRecap.incomplete ? (
            <p className="pos-tech-note text-amber-700 dark:text-amber-400">
              {livresRecap.alert ?? 'Complétez format et nombre de pages pour le calcul matière détaillé.'}
            </p>
          ) : null}
          <div className="pos-tech-dl">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Article</span>
              <span className="font-semibold text-right">{livresRecap.articleLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Type</span>
              <span className="font-semibold text-right">{livresRecap.typeLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Format</span>
              <span className="font-mono font-semibold text-right">{livresRecap.formatLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Dimensions</span>
              <span className="font-mono font-semibold text-right">{livresRecap.dimensionsLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nombre de pages</span>
              <span className="font-mono">{livresRecap.pageCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nombre de feuilles</span>
              <span className="font-mono">{livresRecap.sheetCount}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Recto / recto-verso</span>
              <span className="font-mono text-right">{livresRecap.printModeLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Couleur impression intérieur</span>
              <span className="font-semibold text-right">{livresRecap.couleurInterieur}</span>
            </div>
            {livresRecap.pagesNoir != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pages noir</span>
                <span className="font-mono">{livresRecap.pagesNoir}</span>
              </div>
            ) : null}
            {livresRecap.pagesQuadri != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pages quadri</span>
                <span className="font-mono">{livresRecap.pagesQuadri}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Intérieur — matière</span>
              <span className="font-semibold text-right">{livresRecap.matiereInterieure}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Intérieur — grammage</span>
              <span className="font-mono text-right">{livresRecap.grammageInterieur}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Couverture — matière</span>
              <span className="font-semibold text-right">{livresRecap.matiereCouverture}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Couverture — grammage</span>
              <span className="font-mono text-right">{livresRecap.grammageCouverture}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nombre de couvertures</span>
              <span className="font-mono">{livresRecap.nombreCouverture}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface intérieure</span>
              <span className="font-mono">{livresRecap.interiorSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface couverture</span>
              <span className="font-mono">{livresRecap.coverSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface brute totale</span>
              <span className="font-mono font-bold text-[#FF174D]">{livresRecap.totalGrossSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Épaisseur estimée du bloc</span>
              <span className="font-mono">{livresRecap.blockThicknessMm} mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Épaisseur totale</span>
              <span className="font-mono">{livresRecap.totalThicknessMm} mm</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Reliure compatible</span>
              <span className="font-semibold text-right">{livresRecap.bindingLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Référence de reliure</span>
              <span className="font-mono text-[10px] text-right">{livresRecap.bindingReference}</span>
            </div>
            {livresRecap.prixMatiereInterieure != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix matière intérieure</span>
                <span className="font-mono">{formatPrice(livresRecap.prixMatiereInterieure)}</span>
              </div>
            ) : null}
            {livresRecap.prixImpressionNoir != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix impression intérieur noir</span>
                <span className="font-mono">{formatPrice(livresRecap.prixImpressionNoir)}</span>
              </div>
            ) : null}
            {livresRecap.prixImpressionQuadri != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix impression intérieur quadri</span>
                <span className="font-mono">{formatPrice(livresRecap.prixImpressionQuadri)}</span>
              </div>
            ) : null}
            {livresRecap.prixCouverture != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix couverture</span>
                <span className="font-mono">{formatPrice(livresRecap.prixCouverture)}</span>
              </div>
            ) : null}
            {livresRecap.prixFinition != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix finition</span>
                <span className="font-mono">{formatPrice(livresRecap.prixFinition)}</span>
              </div>
            ) : null}
            {livresRecap.prixReliure != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix reliure</span>
                <span className="font-mono">{formatPrice(livresRecap.prixReliure)}</span>
              </div>
            ) : null}
            {livresRecap.prixCalculable && livresRecap.prixUnitaire != null ? (
              <div className="flex justify-between border-t border-[#EEF2F7] dark:border-border/40 pt-2 mt-2">
                <span className="font-bold">Prix automatique total</span>
                <span className="font-mono font-bold">{formatPrice(livresRecap.prixUnitaire)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Marge commerciale</span>
              <span className="font-mono text-[10px] text-right">{livresRecap.margeRule}</span>
            </div>
            {livresRecap.alert ? (
              <p className="pos-tech-note text-amber-700 dark:text-amber-400">{livresRecap.alert}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {customSurfaceRecap ? (
        <section className="pos-tech-block">
          <header className="pos-tech-block__head">
            <h3 className="pos-tech-block__title">Récapitulatif matière</h3>
            <span className="pos-tech-block__badge">Surface L×l</span>
          </header>
          <div className="pos-tech-dl">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Format</span>
              <span className="font-mono font-semibold text-right">{customSurfaceRecap.formatLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Dimensions nettes</span>
              <span className="font-mono font-semibold text-right">
                {customSurfaceRecap.widthMm}×{customSurfaceRecap.heightMm} mm
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Dimensions brutes (+100 mm)</span>
              <span className="font-mono font-semibold text-right">
                {customSurfaceRecap.grossWidthMm}×{customSurfaceRecap.grossHeightMm} mm
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface réelle unit.</span>
              <span className="font-mono">{customSurfaceRecap.realSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface brute unit.</span>
              <span className="font-mono font-bold text-[#FF174D]">{customSurfaceRecap.grossSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface brute totale</span>
              <span className="font-mono font-bold">{customSurfaceRecap.totalGrossSurfaceM2} m²</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Règle de marge</span>
              <span className="font-mono text-[10px] text-right">{customSurfaceRecap.margeRule}</span>
            </div>
          </div>
        </section>
      ) : null}

      {boxSurface ? (
        <section className="pos-tech-block">
          <header className="pos-tech-block__head">
            <h3 className="pos-tech-block__title">Récapitulation mat brute</h3>
          </header>
          <div className="pos-tech-dl">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Format développé</span>
              <span className="font-mono font-semibold text-right">{boxSurface.formatDeveloppe}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Format brut</span>
              <span className="font-mono font-semibold text-right">{boxSurface.formatBrut}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface utilisée</span>
              <span className="font-mono font-bold text-[#FF174D]">
                {boxSurface.surfaceMm2.toLocaleString('fr-FR')} mm²
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Surface en m²</span>
              <span className="font-mono">{boxSurface.surfaceM2} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Marge sécurité</span>
              <span className="font-mono text-[10px]">{boxSurface.margeRule}</span>
            </div>
            {'formatInternational' in boxSurface && boxSurface.formatInternational ? (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Format feuille</span>
                <span className="font-mono font-semibold text-right">{boxSurface.formatInternational}</span>
              </div>
            ) : null}
            {'posesPerSheet' in boxSurface && boxSurface.posesPerSheet != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Poses / feuille</span>
                <span className="font-mono">{boxSurface.posesPerSheet}</span>
              </div>
            ) : null}
            {'surfaceFactureeM2' in boxSurface && boxSurface.surfaceFactureeM2 != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Surface facturée unit.</span>
                <span className="font-mono">{boxSurface.surfaceFactureeM2} m²</span>
              </div>
            ) : null}
            {'tauxChutePct' in boxSurface && boxSurface.tauxChutePct != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taux de chute</span>
                <span className="font-mono">{boxSurface.tauxChutePct} %</span>
              </div>
            ) : null}
            {'poidsMatiereG' in boxSurface && boxSurface.poidsMatiereG != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Poids matière est.</span>
                <span className="font-mono">{boxSurface.poidsMatiereG} g</span>
              </div>
            ) : null}
            {'epaisseurMm' in boxSurface && boxSurface.epaisseurMm != null ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Épaisseur est.</span>
                <span className="font-mono">{boxSurface.epaisseurMm} mm</span>
              </div>
            ) : null}
            {'alert' in boxSurface && boxSurface.alert ? (
              <p className="pos-tech-note text-amber-700 dark:text-amber-400">{boxSurface.alert}</p>
            ) : null}
            <div className="pos-tech-dl__group">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Structure</span>
                <span className="font-semibold">{boxSurface.structure}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cotes L×H×P</span>
                <span className="font-mono">
                  {boxSurface.L}×{boxSurface.H}×{boxSurface.P} mm
                </span>
              </div>
              {boxSurface.rabatAimante != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rabat aimanté</span>
                  <span className="font-mono">{boxSurface.rabatAimante} mm</span>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        isPackaging && (
          <section className="pos-tech-block pos-tech-block--empty">
            <header className="pos-tech-block__head">
              <h3 className="pos-tech-block__title">Récapitulation mat brute</h3>
            </header>
            <p className="pos-tech-note">En attente des dimensions</p>
          </section>
        )
      )}

      {!hideGfSurfaceBlock && !isBache && (grandFormatM2 || gfBillable) && (
        <section className="pos-tech-block">
          <header className="pos-tech-block__head">
            <h3 className="pos-tech-block__title">Récapitulatif technique</h3>
            <span className="pos-tech-block__badge">Grand Format</span>
          </header>
          <div className="pos-tech-dl">
            {gfBillable ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensions client</span>
                  <span className="font-mono font-semibold">
                    {gfBillable.clientLargeurCm} × {gfBillable.clientHauteurCm} cm
                  </span>
                </div>
                {gfBillable.laizeUtiliseeCm != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Laize</span>
                    <span className="font-mono">{gfBillable.laizeLabel ?? `${gfBillable.laizeUtiliseeCm} cm`}</span>
                  </div>
                )}
                {gfBillable.orientation && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orientation</span>
                    <span className="font-mono capitalize">{gfBillable.orientation}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Surface réelle</span>
                  <span className="font-mono">{Number(gfBillable.surfaceReelleM2).toFixed(2)} m²</span>
                </div>
                {gfBillable.surfaceLaizeM2 > 0 && gfBillable.surfaceLaizeM2 !== gfBillable.surfaceReelleM2 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Surface consommée laize</span>
                    <span className="font-mono">{Number(gfBillable.surfaceLaizeM2).toFixed(2)} m²</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Surface facturable</span>
                  <span className="font-mono font-bold text-[#FF174D]">
                    {Number(gfBillable.surfaceFactureeM2).toFixed(2)} m²
                  </span>
                </div>
                {gfBillable.largeurFactureeCm > 0 && gfBillable.longueurFactureeCm > 0 && (
                  <p className="pos-tech-note" style={{ marginBottom: 0 }}>
                    Calcul :{' '}
                    <strong className="font-mono text-foreground">
                      {gfBillable.largeurFactureeCm} × {gfBillable.longueurFactureeCm} cm ÷ 10 000
                    </strong>
                    {' = '}
                    <strong className="font-mono text-[#FF174D]">
                      {Number(gfBillable.surfaceFactureeM2).toFixed(2)} m²
                    </strong>
                  </p>
                )}
                {(gfBillable.ruleMessage
                  || ('conversionLaizeLabel' in gfBillable
                    && (gfBillable as { conversionLaizeLabel?: string }).conversionLaizeLabel)) && (
                  <p className="pos-tech-note" style={{ marginBottom: 0 }}>
                    {gfBillable.ruleMessage
                      || (gfBillable as { conversionLaizeLabel?: string }).conversionLaizeLabel}
                  </p>
                )}
                {gfBillable.assemblageRequired && (
                  <p className="text-[10px] text-[#F59E0B] font-semibold">
                    Assemblage requis — {gfBillable.strips} bande(s)
                  </p>
                )}
                {gfBillable.prixM2 != null && gfBillable.prixM2 > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prix /m²</span>
                    <span className="font-mono">{formatPrice(gfBillable.prixM2)} Ar</span>
                  </div>
                )}
                {gfBillable.prixUnitaire > 0 && !gfBillable.surDevis && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prix estimé unitaire</span>
                    <span className="font-mono font-bold text-[#FF174D]">
                      {formatPrice(gfBillable.prixUnitaire)} Ar
                    </span>
                  </div>
                )}
                {gfBillable.warning && (
                  <p className="text-[10px] text-[#F59E0B] mt-1 font-semibold">⚠ {gfBillable.warning}</p>
                )}
              </>
            ) : grandFormatM2 ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensions</span>
                  <span className="font-mono font-semibold">
                    {grandFormatM2.largeur} × {grandFormatM2.hauteur} cm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Surface</span>
                  <span className="font-mono font-bold text-[#FF174D]">{grandFormatM2.m2} m²</span>
                </div>
                {productConfig?.prixM2 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prix /m²</span>
                    <span className="font-mono">{formatPrice(productConfig.prixM2)} Ar</span>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </section>
      )}
          </div>
        </details>
      )}
    </div>
  );
}

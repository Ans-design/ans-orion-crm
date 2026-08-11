'use client';

import { Info } from 'lucide-react';
import { formatPrice } from '@/lib/format/french-typography';
import type { PosMarginInsight, PosPriceCalc } from '@/components/pos/pos-summary-content';

type Props = {
  priceCalc: PosPriceCalc;
  config: Record<string, unknown>;
  updateConfig: (key: string, value: unknown) => void;
  marginInsight?: PosMarginInsight | null;
  showMargin?: boolean;
  pricePending?: boolean;
};

/** Tarification Soft UI — compacte, sous la synthèse sticky */
export function ProductPricingPanel({
  priceCalc,
  config,
  updateConfig,
  marginInsight,
  showMargin = false,
  pricePending = false,
}: Props) {
  if (priceCalc.calculable) {
    // Prix déjà affiché : pas d’état « recalcul » (évite opacity / titre qui clignotent)
    return (
      <div className="pos-tarif-soft" aria-busy={false}>
        <p className="pos-tarif-soft__title">
          Détail tarif
        </p>
        <div className="pos-tarif-soft__lines">
          {priceCalc.publicationBreakdown && (
            <>
              <div className="pos-tarif-soft__line">
                <span>
                  Intérieur ({priceCalc.publicationBreakdown.pages} p. /{' '}
                  {priceCalc.publicationBreakdown.feuillesPhysiques} f.)
                </span>
                <span>{formatPrice(priceCalc.publicationBreakdown.prixInterieur)} Ar</span>
              </div>
              <div className="pos-tarif-soft__line">
                <span>
                  Couverture
                  {priceCalc.publicationBreakdown.nombreCouverture
                    ? ` (${priceCalc.publicationBreakdown.nombreCouverture}×)`
                    : ''}
                </span>
                <span>{formatPrice(priceCalc.publicationBreakdown.prixCouverture)} Ar</span>
              </div>
              <div className="pos-tarif-soft__line">
                <span>
                  Reliure
                  {priceCalc.publicationBreakdown.reliureLabel
                    ? ` (${priceCalc.publicationBreakdown.reliureLabel})`
                    : ''}
                </span>
                <span>{formatPrice(priceCalc.publicationBreakdown.prixReliure)} Ar</span>
              </div>
              {priceCalc.publicationBreakdown.prixFinitions > 0 && (
                <div className="pos-tarif-soft__line">
                  <span>Finitions</span>
                  <span>{formatPrice(priceCalc.publicationBreakdown.prixFinitions)} Ar</span>
                </div>
              )}
            </>
          )}
          {priceCalc.carterieBreakdown && (
            <>
              {priceCalc.carterieBreakdown.pricingMode === 'excel_grid' ? (
                <>
                  <div className="pos-tarif-soft__line">
                    <span>
                      Grille PRIX 2026
                      {priceCalc.carterieBreakdown.gridColumnLabel
                        ? ` · ${priceCalc.carterieBreakdown.gridColumnLabel}`
                        : ''}
                    </span>
                    <span>
                      {formatPrice(priceCalc.carterieBreakdown.prixParPieceAvantDecoupe)} Ar / pièce
                    </span>
                  </div>
                  {priceCalc.carterieBreakdown.gridTierLabel ? (
                    <div className="pos-tarif-soft__line">
                      <span>Palier quantité</span>
                      <span>{priceCalc.carterieBreakdown.gridTierLabel}</span>
                    </div>
                  ) : null}
                  {(priceCalc.carterieBreakdown.finitionsDetail ?? []).map((f) => (
                    <div key={f.label} className="pos-tarif-soft__line">
                      <span>{f.label}</span>
                      <span>{formatPrice(f.amount)} Ar / pièce</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="pos-tarif-soft__line">
                    <span>Prix impression feuille</span>
                    <span>{formatPrice(priceCalc.carterieBreakdown.prixImpressionFeuille)} Ar</span>
                  </div>
                  {(priceCalc.carterieBreakdown.finitionsDetail ?? []).map((f) => (
                    <div key={f.label} className="pos-tarif-soft__line">
                      <span>{f.label}</span>
                      <span>{formatPrice(f.amount)} Ar</span>
                    </div>
                  ))}
                  {!(priceCalc.carterieBreakdown.finitionsDetail?.length)
                    && priceCalc.carterieBreakdown.prixFinitionsFeuille > 0 && (
                    <div className="pos-tarif-soft__line">
                      <span>Finitions feuille</span>
                      <span>{formatPrice(priceCalc.carterieBreakdown.prixFinitionsFeuille)} Ar</span>
                    </div>
                  )}
                  <div className="pos-tarif-soft__line">
                    <span>Pièces par feuille</span>
                    <span>{priceCalc.carterieBreakdown.piecesParFeuille}</span>
                  </div>
                  <div className="pos-tarif-soft__line">
                    <span>Avant découpe</span>
                    <span>{formatPrice(priceCalc.carterieBreakdown.prixParPieceAvantDecoupe)} Ar / pièce</span>
                  </div>
                  {priceCalc.carterieBreakdown.prixDecoupeParPiece > 0 && (
                    <div className="pos-tarif-soft__line">
                      <span>Découpe</span>
                      <span>{formatPrice(priceCalc.carterieBreakdown.prixDecoupeParPiece)} Ar / pièce</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {priceCalc.flyerBreakdown && (
            <>
              <div className="pos-tarif-soft__line">
                <span>Prix impression</span>
                <span>{formatPrice(priceCalc.flyerBreakdown.prixImpressionUnitaire)} Ar / pièce</span>
              </div>
              <div className="pos-tarif-soft__line">
                <span>
                  Pliage
                  {priceCalc.flyerBreakdown.nombrePlis > 0
                    ? ` (${priceCalc.flyerBreakdown.nombrePlis} pli${priceCalc.flyerBreakdown.nombrePlis > 1 ? 's' : ''})`
                    : ' (1 volet)'}
                </span>
                <span>{formatPrice(priceCalc.flyerBreakdown.prixPliageUnitaire)} Ar / pièce</span>
              </div>
            </>
          )}
          {priceCalc.packagingBreakdown && (
            <>
              <div className="pos-tarif-soft__line">
                <span>
                  Format éq. {priceCalc.packagingBreakdown.formatEquivalent}
                  {' '}({priceCalc.packagingBreakdown.equivA4}×A4)
                </span>
                <span>
                  {priceCalc.packagingBreakdown.surfaceTheoriqueM2 > 0
                    ? `${priceCalc.packagingBreakdown.surfaceTheoriqueM2.toFixed(3)} m²`
                    : '—'}
                </span>
              </div>
              <div className="pos-tarif-soft__line">
                <span>Impression SF</span>
                <span>{formatPrice(priceCalc.packagingBreakdown.prixImpressionBrut)} Ar</span>
              </div>
              {priceCalc.packagingBreakdown.prixDechetsMatiere > 0 && (
                <div className="pos-tarif-soft__line">
                  <span>Déchets matière {priceCalc.packagingBreakdown.margeDechetsPct}%</span>
                  <span>+{formatPrice(priceCalc.packagingBreakdown.prixDechetsMatiere)} Ar</span>
                </div>
              )}
              {(priceCalc.packagingBreakdown.finitionLines ?? []).map((f) => (
                <div key={f.label} className="pos-tarif-soft__line">
                  <span>{f.label}</span>
                  <span>{formatPrice(f.amount)} Ar</span>
                </div>
              ))}
              {!(priceCalc.packagingBreakdown.finitionLines?.length)
                && priceCalc.packagingBreakdown.prixFinitions > 0 && (
                <div className="pos-tarif-soft__line">
                  <span>Finitions</span>
                  <span>{formatPrice(priceCalc.packagingBreakdown.prixFinitions)} Ar</span>
                </div>
              )}
              {priceCalc.packagingBreakdown.prixFaconnage > 0 && (
                <div className="pos-tarif-soft__line">
                  <span>Façonnage</span>
                  <span>{formatPrice(priceCalc.packagingBreakdown.prixFaconnage)} Ar</span>
                </div>
              )}
              <div className="pos-tarif-soft__line">
                <span>Sous-total dépenses</span>
                <span>{formatPrice(priceCalc.packagingBreakdown.sousTotalDepenses)} Ar</span>
              </div>
              <div className="pos-tarif-soft__line is-ok">
                <span>Bénéfice {priceCalc.packagingBreakdown.beneficePct}%</span>
                <span>+{formatPrice(priceCalc.packagingBreakdown.benefice)} Ar</span>
              </div>
              <div className="pos-tarif-soft__line is-ok">
                <span>Marge dépense {priceCalc.packagingBreakdown.margeDepensePct}%</span>
                <span>+{formatPrice(priceCalc.packagingBreakdown.margeDepense)} Ar</span>
              </div>
            </>
          )}
          <div className="pos-tarif-soft__line">
            <span>Unitaire</span>
            <span>{formatPrice(priceCalc.prixUnit)} Ar</span>
          </div>
          <div className="pos-tarif-soft__line">
            <span>Quantité</span>
            <span>× {priceCalc.qty}</span>
          </div>
          {priceCalc.remiseRate > 0 && (
            <div className="pos-tarif-soft__line is-ok">
              <span>Remise {Math.round(priceCalc.remiseRate * 100)}%</span>
              <span>−{formatPrice(priceCalc.remiseAmount)} Ar</span>
            </div>
          )}
          {priceCalc.clicheFee > 0 && (
            <div className="pos-tarif-soft__line is-warn">
              <span>Cliché</span>
              <span>+{formatPrice(priceCalc.clicheFee)} Ar</span>
            </div>
          )}
          {priceCalc.appliedTier && (
            <div className="pos-tarif-soft__tier">
              Palier {priceCalc.appliedTier.label}
            </div>
          )}
        </div>
        {showMargin && marginInsight && (
          <p className="pos-tarif-soft__margin">
            Marge est. {marginInsight.marginRatePct}% · {formatPrice(marginInsight.marginAmount)} Ar
          </p>
        )}
        {priceCalc.pricingNote && (
          <p className="pos-tarif-soft__note">{priceCalc.pricingNote}</p>
        )}
      </div>
    );
  }

  return (
    <div className="pos-tarif-soft pos-tarif-soft--pending">
      <div className="pos-tarif-soft__pending-head">
        <span className="pos-tarif-soft__pending-ico" aria-hidden>
          <Info size={16} />
        </span>
        <div>
          <p className="font-bold text-[11px] text-slate-800 dark:text-slate-100">
            {pricePending ? 'Prix final à valider' : 'Prix en attente'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            {priceCalc.pricingNote
              ?? 'Complétez la configuration — le total s’affiche automatiquement.'}
          </p>
        </div>
      </div>
      <label className="pos-tarif-soft__manual">
        <span>Saisir un prix unitaire (Ar)</span>
        <input
          type="number"
          min={0}
          step={1}
          placeholder="Ex. 5000"
          value={config._prix_force != null ? String(config._prix_force) : ''}
          onChange={(e) => updateConfig('_prix_force', e.target.value)}
          className="pos-tarif-soft__input"
        />
      </label>
    </div>
  );
}

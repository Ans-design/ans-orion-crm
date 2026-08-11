/**
 * Pont Bâche → GrandFormatBillableResult — une seule forme pour panier, devis, marge, récap.
 */

import type { BacheEvaluation } from '@/lib/grand-format/bache-rules';
import type { GrandFormatBillableResult } from '@/lib/grand-format/types';
import { DEFAULT_GF_ADMIN_PRICING } from '@/lib/grand-format/gf-admin-config';
import { laizeCmToChipLabel } from '@/lib/grand-format/laize-utils';

export function bacheEvalToGfBillable(ev: BacheEvaluation, prixM2?: number | null): GrandFormatBillableResult {
  const pricingSurfaceMode = DEFAULT_GF_ADMIN_PRICING.pricingSurfaceMode;
  const billableM2 =
    pricingSurfaceMode === 'laize' && ev.surfaceLaizeM2 > 0
      ? ev.surfaceLaizeM2
      : ev.surfaceFacturableM2 > 0
        ? ev.surfaceFacturableM2
        : ev.surfaceReelleM2;

  const laizeUtiliseeCm = ev.laizeUtiliseeCm
    ?? (ev.laizeM != null ? Math.round(ev.laizeM * 100) : null);

  return {
    clientLargeurCm: ev.longueurCm,
    clientHauteurCm: ev.largeurCm,
    petiteDimensionCm: Math.min(ev.longueurCm, ev.largeurCm),
    grandeDimensionCm: Math.max(ev.longueurCm, ev.largeurCm),
    laizeUtiliseeCm,
    laizeLabel:
      ev.laize
      || ev.recommendedLaize
      || (laizeUtiliseeCm != null ? laizeCmToChipLabel(laizeUtiliseeCm) : null),
    laizeExactMatch: Boolean(ev.laizeRuleLabel?.toLowerCase().includes('exacte')),
    laizeRuleApplied: Boolean(
      ev.laizeRuleLabel?.toLowerCase().includes('conversion laize : oui')
      || ev.laizeRuleLabel?.toLowerCase().includes('arrondi'),
    ),
    largeurFactureeCm: ev.billableWidthCm > 0
      ? ev.billableWidthCm
      : Math.min(ev.longueurCm, ev.largeurCm),
    longueurFactureeCm: ev.billableLengthCm > 0
      ? ev.billableLengthCm
      : Math.max(ev.longueurCm, ev.largeurCm),
    orientation:
      ev.orientation === 'normal' || ev.orientation === 'rotation' || ev.orientation === 'assemblage'
        ? ev.orientation
        : null,
    assemblageRequired: ev.assemblageRequired,
    strips: ev.strips,
    surfaceReelleM2: ev.surfaceReelleM2,
    surfaceLaizeM2: ev.surfaceLaizeM2,
    surfaceFactureeM2: ev.surfaceFacturableM2 || billableM2,
    pricingSurfaceMode,
    prixM2: prixM2 ?? ev.priceM2,
    prixUnitaire: ev.finalTotal != null && ev.quantite > 0
      ? Math.round(ev.finalTotal / ev.quantite)
      : ev.automaticTotal != null && ev.quantite > 0
        ? Math.round(ev.automaticTotal / ev.quantite)
        : 0,
    calculable: (ev.finalTotal ?? 0) > 0 || (ev.automaticTotal ?? 0) > 0,
    surDevis: ev.surDevis && !(ev.finalTotal && ev.finalTotal > 0),
    ruleMessage: ev.laizeRuleLabel ?? undefined,
  };
}

/** Snapshot unifié pour panier / devis (surfaces + détail bâche). */
export function bacheCartSnapshot(
  ev: BacheEvaluation,
  prixM2?: number | null,
): Record<string, unknown> {
  return {
    _gfBillable: bacheEvalToGfBillable(ev, prixM2),
    _bacheEval: ev,
  };
}

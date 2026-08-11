import type { PriceResult } from '@/lib/pricing/price-types';
import type { AppliedTierSnapshot } from '@/lib/pricing/tier-price';
import type { MaterialStockSnapshot } from '@/lib/pricing/material-stock-snapshot';
import { parsePricingSnapshotEnvelope, type PricingSnapshotEnvelopeValidated } from '@/lib/validators/pricing-snapshot';

export type PricingSnapshotEnvelope = PricingSnapshotEnvelopeValidated;

function readSnapshotRecord(snapshot: Record<string, unknown> | undefined): Record<string, unknown> {
  return snapshot && typeof snapshot === 'object' ? snapshot : {};
}

/** Extrait l'enveloppe tarifaire depuis un résultat de calcul unifié */
export function buildPricingSnapshotEnvelope(result: PriceResult): PricingSnapshotEnvelope {
  const snap = readSnapshotRecord(result.snapshot);
  const pipeline =
    snap.pipeline && typeof snap.pipeline === 'object'
      ? (snap.pipeline as Record<string, unknown>)
      : {};
  const appliedTier =
    (snap.appliedTier as AppliedTierSnapshot | null | undefined) ??
    (pipeline.appliedTier as AppliedTierSnapshot | null | undefined) ??
    null;

  return {
    version: 1,
    calculatedAt: String(snap.calculatedAt ?? new Date().toISOString()),
    priceSource: typeof snap.priceSource === 'string' ? snap.priceSource : null,
    formulaVersion:
      typeof snap.formulaVersion === 'number' || typeof snap.formulaVersion === 'string'
        ? snap.formulaVersion
        : typeof pipeline.formulaVersion === 'number' || typeof pipeline.formulaVersion === 'string'
          ? pipeline.formulaVersion
          : null,
    formulaExpression:
      typeof result.formulaApplied === 'string'
        ? result.formulaApplied
        : typeof pipeline.expression === 'string'
          ? pipeline.expression
          : null,
    profileStatus: typeof snap.profileStatus === 'string' ? snap.profileStatus : null,
    dynamicEngine: snap.dynamicEngine === true,
    appliedTier,
    prixUnitaire: result.prixUnitaire,
    totalHT: result.totalHT,
  };
}

/** Fusionne config + enveloppe tarifaire pour snapshot devis/commande */
export function mergeConfigWithPricingSnapshot(
  config: Record<string, unknown>,
  result: PriceResult,
  materialStock?: MaterialStockSnapshot | null,
): Record<string, unknown> {
  const envelope = {
    ...buildPricingSnapshotEnvelope(result),
    ...(materialStock ? { materialStock } : {}),
  };
  const validated = parsePricingSnapshotEnvelope(envelope);
  if (!validated) {
    throw new Error('Enveloppe tarifaire invalide — recalcul requis');
  }
  return {
    ...config,
    _pricingSnapshot: validated,
    ...(materialStock ? { _materialStock: materialStock } : {}),
  };
}

/** Lit l'enveloppe depuis un configSnapshot existant (devis, panier, commande) */
export function readPricingSnapshotFromConfig(
  configSnapshot: Record<string, unknown> | null | undefined,
): PricingSnapshotEnvelope | null {
  return parsePricingSnapshotEnvelope(configSnapshot?._pricingSnapshot);
}

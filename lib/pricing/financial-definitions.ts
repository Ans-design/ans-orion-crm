/**
 * Définitions financières non ambiguës (Ultra-Prompt §7).
 * Taux de marge = sur coût ; taux de marque = sur vente.
 */

export type MarginBreakdown = {
  costComplete: number;
  sellHt: number;
  benefit: number;
  /** bénéfice / coût complet */
  marginOnCostRate: number | null;
  /** bénéfice / prix de vente HT */
  markupOnSellRate: number | null;
  /** prix / coût */
  multiplier: number | null;
};

export function computeFinancialBreakdown(
  sellHt: number,
  costComplete: number,
): MarginBreakdown {
  const sell = Number.isFinite(sellHt) ? sellHt : 0;
  const cost = Number.isFinite(costComplete) ? costComplete : 0;
  const benefit = sell - cost;
  return {
    costComplete: cost,
    sellHt: sell,
    benefit,
    marginOnCostRate: cost > 0 ? benefit / cost : null,
    markupOnSellRate: sell > 0 ? benefit / sell : null,
    multiplier: cost > 0 ? sell / cost : null,
  };
}

export function formatRatePct(rate: number | null, digits = 1): string {
  if (rate == null || !Number.isFinite(rate)) return '—';
  return `${(rate * 100).toFixed(digits)} %`;
}

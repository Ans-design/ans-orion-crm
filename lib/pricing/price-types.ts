export function normalizeQty(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export interface PriceResult {
  articleId: string;
  articleLabel: string;
  qty: number;
  prixUnitaire: number;
  sousTotal: number;
  remiseRate: number;
  remiseAmount: number;
  clicheFee: number;
  totalHT: number;
  totalTTC: number;
  pricingMode: 'auto' | 'force_pu' | 'force_total';
  snapshot: Record<string, unknown>;
  formulaApplied?: string;
}

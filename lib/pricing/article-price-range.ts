/** Fourchette affichée sur les cartes articles admin (maquette variante 2) */

export type ArticlePriceRangeInput = {
  prixBase: number | null;
  saleUnit?: string | null;
  discountTiers?: {
    unitPrice: number | null;
    discountPercent: number;
    active?: boolean;
  }[];
  catalogueDepart?: number | null;
};

export type ArticlePriceRange = {
  min: number;
  max: number;
  unit: string;
  main: string;
  suffix: string;
  hint?: string;
};

function roundAr(n: number): number {
  return Math.round(n);
}

function fmtAr(n: number): string {
  return `${roundAr(n).toLocaleString('fr-FR')} Ar`;
}

function collectUnitPrices(input: ArticlePriceRangeInput): number[] {
  const base = input.prixBase ?? input.catalogueDepart ?? null;
  const tiers = (input.discountTiers ?? []).filter((t) => t.active !== false);
  const prices: number[] = [];

  for (const tier of tiers) {
    if (tier.unitPrice != null && Number.isFinite(tier.unitPrice) && tier.unitPrice > 0) {
      prices.push(tier.unitPrice);
    } else if (base != null && Number.isFinite(base) && tier.discountPercent > 0) {
      prices.push(base * (1 - tier.discountPercent / 100));
    }
  }

  if (base != null && Number.isFinite(base) && base > 0) {
    prices.push(base);
  }

  return [...new Set(prices.map(roundAr).filter((p) => p > 0))];
}

/** Retourne null si aucun prix exploitable */
export function getArticlePriceRange(input: ArticlePriceRangeInput): ArticlePriceRange | null {
  const unit = (input.saleUnit || 'pièce').trim() || 'pièce';
  const prices = collectUnitPrices(input);

  if (!prices.length) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const suffix = `/ ${unit}`;

  if (min === max) {
    return {
      min,
      max,
      unit,
      main: fmtAr(min),
      suffix,
    };
  }

  return {
    min,
    max,
    unit,
    main: `${min.toLocaleString('fr-FR')} – ${fmtAr(max)}`,
    suffix,
    hint: '(selon qté)',
  };
}

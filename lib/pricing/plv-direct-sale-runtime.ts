/**
 * Overrides prix PLV depuis Articles vente directe (AVD008/009/011…).
 * Backoffice configure → runtime consomme — pas de prix hardcodés côté UI.
 */

export type PlvDirectSaleFlatOverride = {
  /** SKU DirectSale (ex. AVD008) */
  sourceRef: string;
  articleId: string;
  type: string;
  format?: string;
  unitPrice: number;
};

export type PlvDirectSaleRuntimeParams = {
  /** Prix pièce plats indexés par article canonique */
  overrides: PlvDirectSaleFlatOverride[];
  /** prixBase catalogue « à partir de » par article */
  prixBaseByArticle: Record<string, number>;
};

const EMPTY: PlvDirectSaleRuntimeParams = {
  overrides: [],
  prixBaseByArticle: {},
};

let runtime: PlvDirectSaleRuntimeParams = EMPTY;

export function setPlvDirectSaleRuntimeParams(p: PlvDirectSaleRuntimeParams | null) {
  runtime = p ?? EMPTY;
}

export function getPlvDirectSaleRuntimeParams(): PlvDirectSaleRuntimeParams {
  return runtime;
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[×x]/g, 'x')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Match exact type+format, sinon type seul. */
export function resolvePlvDirectSaleFlatPrice(
  articleId: string,
  config: Record<string, unknown>,
): PlvDirectSaleFlatOverride | null {
  const type = String(config.type ?? '').trim();
  if (!type) return null;
  const format = String(config.format ?? '').trim();
  const list = runtime.overrides.filter((o) => o.articleId === articleId);
  if (!list.length) return null;

  const typeN = norm(type);
  const formatN = format ? norm(format) : '';

  if (formatN) {
    const exact = list.find(
      (o) => norm(o.type) === typeN && o.format && norm(o.format) === formatN,
    );
    if (exact) return exact;
  }

  return list.find((o) => norm(o.type) === typeN) ?? null;
}

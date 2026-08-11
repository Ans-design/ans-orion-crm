/**
 * Construit un PriceResult depuis une grille PRIX 2026 (+ finitions surplus optionnelles).
 */

import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import {
  applyFixedFees,
  getGlobalPricingConfig,
} from '@/lib/pricing/global-config';
import { DEFAULT_GLOBAL_PRICING } from '@/lib/data/global-pricing';
import { normalizeQty, type PriceResult } from '@/lib/pricing/price-types';
import {
  articleHasPrix2026Grid,
  resolvePrix2026UnitPrice,
  type Prix2026Lookup,
} from '@/lib/data/prix-2026-grids';
import { isCarteriePricingArticle } from '@/lib/pricing/carterie-pricing';
import { isFlyerPricingArticle } from '@/lib/pricing/flyer-pricing';
import { isGrandFormatArticleId } from '@/lib/grand-format/article-meta';

function optionOn(raw: unknown): boolean {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return false;
  if (/^(non|no|sans|0|false|off)/i.test(s)) return false;
  return /oui|yes|avec|mat|brillant|1|true|on/i.test(s) || (s.length > 2 && !/aucun|none|—/.test(s));
}

/**
 * Extras hors grille (Ar / pièce). Pelliculage ignoré si déjà inclus dans la colonne Excel.
 */
export function computePrix2026FinitionSurplus(
  config: Record<string, unknown>,
  lookup: Prix2026Lookup,
): { total: number; detail: Array<{ label: string; amount: number }> } {
  const included = new Set((lookup.includedFinitions ?? []).map((x) => x.toLowerCase()));
  const detail: Array<{ label: string; amount: number }> = [];

  // Goodies / textile / PLV Excel = prix marquage déjà final — pas d’extra automatique.
  // Carterie : gérée dans computeCarteriePrice (ne pas doubler ici).
  if (lookup.sheet === 'Carte de visite') {
    return { total: 0, detail: [] };
  }

  // Suppléments génériques optionnels (Admin chips) — montants unitaires modestes hors grille produit
  if (!included.has('pelliculage') && (optionOn(config.pelliculage) || optionOn(config.finition_pelliculage))) {
    // Ne pas inventer un gros montant : 0 ici — pelliculage = grille CV ou module Finitions standalone
  }

  return { total: detail.reduce((s, d) => s + d.amount, 0), detail };
}

export async function tryComputePrix2026GridPrice(
  articleId: string,
  config: Record<string, unknown>,
  options?: { prixForce?: number; totalForce?: number },
): Promise<PriceResult | null> {
  const { isPrix2026LegacyEnabled } = await import('@/lib/pricing/prix-2026-legacy');
  const { isStrictPosPricing } = await import('@/lib/pos/pos-price-policy');
  // PRX-01 : jamais de grille Excel en STRICT / prod ; opt-in legacy uniquement.
  if (!isPrix2026LegacyEnabled() || isStrictPosPricing()) return null;

  // Moteurs riches prioritaires : surface GF, ISF flyer/carterie, PLV DirectSale/m², textile Admin.
  // Cette grille Excel ne sert qu’aux forfaits pièce (goodies / marquage textile / roll-up plat).
  if (isCarteriePricingArticle(articleId)) return null;
  if (isFlyerPricingArticle(articleId)) return null;
  if (isGrandFormatArticleId(articleId)) return null;
  if (!articleHasPrix2026Grid(articleId)) return null;

  const article = findCatalogueItem(articleId);
  if (!article) return null;

  let qty = normalizeQty(config.qty ?? config.quantite ?? config.quantity ?? config.qte ?? 1);
  if (config.tailles && typeof config.tailles === 'object' && !Array.isArray(config.tailles)) {
    qty =
      Object.values(config.tailles as Record<string, number>).reduce((s, q) => s + (Number(q) || 0), 0) || qty;
  }

  const lookup = resolvePrix2026UnitPrice(articleId, config, qty);
  if (!lookup?.calculable || lookup.unitPrice <= 0) return null;

  const surplus = computePrix2026FinitionSurplus(config, lookup);
  let unitPrice = lookup.unitPrice + surplus.total;
  let pricingMode: PriceResult['pricingMode'] = 'auto';

  if (options?.prixForce && options.prixForce > 0) {
    unitPrice = options.prixForce;
    pricingMode = 'force_pu';
  }

  let sousTotal = unitPrice * qty;
  let remiseRate = 0;
  let remiseAmount = 0;

  if (options?.totalForce && options.totalForce > 0) {
    sousTotal = options.totalForce;
    unitPrice = qty > 0 ? Math.round(options.totalForce / qty) : options.totalForce;
    pricingMode = 'force_total';
  }

  const globalCfg = (await getGlobalPricingConfig().catch(() => null)) ?? DEFAULT_GLOBAL_PRICING;
  const fees = applyFixedFees(
    sousTotal,
    {
      bat: String(config.bat || config.epreuve || ''),
      livraison: String(config.livraison || config.modeLivraison || ''),
    },
    globalCfg,
  );
  const totalHT = fees.totalHT;
  const tvaRate = ((globalCfg.tvaDefault ?? 20) as number) / 100;

  return {
    articleId,
    articleLabel: article.name,
    qty,
    prixUnitaire: unitPrice,
    sousTotal,
    remiseRate,
    remiseAmount,
    clicheFee: 0,
    totalHT,
    totalTTC: Math.round(totalHT * (1 + tvaRate)),
    pricingMode,
    formulaApplied: lookup.formula,
    snapshot: {
      config: { ...config, qty },
      calculatedAt: new Date().toISOString(),
      priceSource: 'prix2026ExcelGrid',
      prix2026: {
        sheet: lookup.sheet,
        tierLabel: lookup.tierLabel,
        columnLabel: lookup.columnLabel,
        unitPrice: lookup.unitPrice,
        finitionSurplus: surplus.total,
        finitionsDetail: surplus.detail,
      },
      pricingNote: [
        `Grille PRIX 2026 · ${lookup.sheet}`,
        lookup.columnLabel,
        lookup.tierLabel ? `Palier ${lookup.tierLabel}` : null,
        `${lookup.unitPrice.toLocaleString('fr-FR')} Ar / pièce`,
      ]
        .filter(Boolean)
        .join(' · '),
    },
  };
}

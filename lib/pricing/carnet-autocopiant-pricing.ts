/**
 * Moteur prix Carnet autocopiant / Facturier.
 * Réutilise formules formats ISF (PaperFormatRule) — pas de formule format parallèle.
 */
import {
  applyImpressionSfFormatPrice,
  paperTierUnitPrice,
  setImpressionSfRuntimeRules,
  getImpressionSfFormatRules,
} from '@/lib/pricing/impression-sf-pricing';
import { DOC_AUTOCOPIANT_CANONICAL_ID } from '@/lib/pos/autocopiant-catalog';
import { DOC_AUTOCOPIANT_IDS } from '@/lib/pos/autocopiant-policy';
import {
  DEFAULT_CARNET_AUTOCOPIANT_PARAMS,
  formatA4Equivalent,
  isCarnetInteriorQuadri,
  isCarnetNumerotationOn,
  parseCarnetFeuillets,
  parseCarnetFormatCode,
  parseCarnetTypeFactor,
  type CarnetAutocopiantParamLike,
} from '@/lib/pricing/carnet-autocopiant-params';

export type CarnetAutocopiantPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  /** Prix unitaire d’un carnet (avant qty × remises volume). */
  prixUnitaire: number;
  formula?: string;
  breakdown?: {
    prixFormatA4: number;
    prixFormat: number;
    typeFactor: number;
    feuillets: number;
    prixPapier: number;
    prixNumerotation: number;
    prixCouverture: number;
    prixReliure: number;
    prixPerforation: number;
    sousTotal: number;
    perteDechet: number;
    wastePct: number;
  };
};

let cachedParams: CarnetAutocopiantParamLike = DEFAULT_CARNET_AUTOCOPIANT_PARAMS;

export function setCarnetAutocopiantRuntimeParams(params: CarnetAutocopiantParamLike | null) {
  if (params) cachedParams = params;
}

export function getCarnetAutocopiantRuntimeParams(): CarnetAutocopiantParamLike {
  return cachedParams;
}

export function isCarnetAutocopiantArticleId(articleId: string): boolean {
  return DOC_AUTOCOPIANT_IDS.has(articleId) || articleId === DOC_AUTOCOPIANT_CANONICAL_ID;
}

function resolveCoverPrice(params: CarnetAutocopiantParamLike): number {
  if (params.couverture300gA3RectoAr > 0) return Math.round(params.couverture300gA3RectoAr);
  // Dérive ISF : PCB ~300G A4 × facteur A3 (grille pcb350)
  const a4 = paperTierUnitPrice('pcb350', 1);
  if (a4 <= 0) return 0;
  const formatted = applyImpressionSfFormatPrice(a4, { format: 'A3' });
  return formatted.surDevis ? Math.round(a4 * 2) : formatted.prixUnitaire;
}

/**
 * Calcule le prix d’un carnet (unité).
 * qty carnets est géré ensuite par calculate.ts (remises volume).
 */
export function computeCarnetAutocopiantPrice(
  config: Record<string, unknown>,
  params: CarnetAutocopiantParamLike = cachedParams,
): CarnetAutocopiantPriceResult {
  const formatRaw = String(config.format ?? '');
  if (/personnalis/i.test(formatRaw)) {
    const w = Number(config.format_largeur) || Number(config.largeur_mm) || 0;
    const h = Number(config.format_hauteur) || Number(config.hauteur_mm) || 0;
    if (!(w > 0 && h > 0)) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'format_personnalise_dims' };
    }
  }

  const formatCode = parseCarnetFormatCode(formatRaw);
  const typeFactor = parseCarnetTypeFactor(
    String(config.duplicopie ?? config.type_autocopiant ?? ''),
    Number(config.nb_copies),
  );
  const feuillets = parseCarnetFeuillets(config);
  const interior = String(config.impression_interieur ?? config.couleur_imp ?? '');
  const quadri = isCarnetInteriorQuadri(interior);
  const prixA4 = quadri ? params.prixA4Quadri : params.prixA4Nb;

  if (!(prixA4 > 0)) {
    return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'prix_a4_manquant' };
  }

  // Réutilise moteur formats ISF (découpe / suppléments Admin)
  const formatted = applyImpressionSfFormatPrice(prixA4, {
    format: formatCode,
    format_largeur: config.format_largeur,
    format_hauteur: config.format_hauteur,
    largeur_mm: config.largeur_mm,
    hauteur_mm: config.hauteur_mm,
  });
  if (formatted.surDevis) {
    return { calculable: false, surDevis: true, prixUnitaire: 0, formula: formatted.formula };
  }

  const prixFormat = formatted.prixUnitaire;
  const prixPapier = Math.round(prixFormat * typeFactor * feuillets);

  const numerotationOn = isCarnetNumerotationOn(String(config.numerotation ?? ''));
  const prixNumerotation = numerotationOn
    ? Math.round(feuillets * params.numerotationArPerPage)
    : 0;

  const prixCouverture = resolveCoverPrice(params);
  const prixReliure = Math.round(params.reliureAr);
  const a4Eq = formatA4Equivalent(formatted.formatUsed || formatCode);
  const prixPerforation = Math.round(feuillets * a4Eq * params.perforationArPerA4);

  const sousTotal = prixPapier + prixNumerotation + prixCouverture + prixReliure + prixPerforation;
  const wastePct = Math.max(0, params.wastePct);
  const perteDechet = Math.round(sousTotal * (wastePct / 100));
  const prixUnitaire = sousTotal + perteDechet;

  return {
    calculable: true,
    surDevis: false,
    prixUnitaire,
    formula: `carnet:${formatCode}×${typeFactor}×${feuillets}|${quadri ? 'quadri' : 'ndg'}|waste${wastePct}%`,
    breakdown: {
      prixFormatA4: prixA4,
      prixFormat,
      typeFactor,
      feuillets,
      prixPapier,
      prixNumerotation,
      prixCouverture,
      prixReliure,
      prixPerforation,
      sousTotal,
      perteDechet,
      wastePct,
    },
  };
}

/** Remise volume carnets — paliers Admin DiscountTier si présents, sinon défauts. */
export function carnetAutocopiantVolumeRemiseRate(qty: number): number {
  if (qty >= 51) return 0.15;
  if (qty >= 11) return 0.08;
  return 0;
}

export { getImpressionSfFormatRules, setImpressionSfRuntimeRules };

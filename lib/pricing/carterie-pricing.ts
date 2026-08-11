/**
 * Prix Carterie = (ISF feuille + finitions feuille) / pièces + découpe pièce − remise.
 * Ne duplique pas les grilles ISF / Finitions.
 */

import { isCarteArticleId } from '@/lib/pos/carte-material-rules';
import {
  computeImpressionSfPrice,
  impressionSfVolumeRemiseAmount,
  impressionSfVolumeRemiseRate,
} from '@/lib/pricing/impression-sf-pricing';
import { isRectoVerso, resolveConfigFace } from '@/lib/pricing/config-normalize';
import { parseCardDimensionsMm } from '@/lib/pricing/carterie-imposition';
import {
  getCarterieRuntimeParams,
  resolveCarteriePiecesPerSheet,
} from '@/lib/pricing/carterie-pricing-rules';
import {
  lookupCarteVisiteExcelUnitPrice,
} from '@/lib/data/carte-visite-prix-2026';

export type CarteriePriceBreakdown = {
  calculable: boolean;
  surDevis: boolean;
  missingField?: string;
  /** excel_grid = onglet PRIX 2026 Carte de visite ; isf_imposition = feuille ÷ pièces */
  pricingMode?: 'excel_grid' | 'isf_imposition';
  gridColumnLabel?: string | null;
  gridTierLabel?: string | null;
  formatFini: string;
  formatFeuille: string;
  piecesParFeuille: number;
  piecesSource: string;
  prixImpressionFeuille: number;
  prixFinitionsFeuille: number;
  finitionsDetail: Array<{ label: string; amount: number }>;
  prixFeuilleTotal: number;
  prixParPieceAvantDecoupe: number;
  prixDecoupeParPiece: number;
  prixUnitaireAvantRemise: number;
  qty: number;
  sousTotal: number;
  remiseRate: number;
  remiseAmount: number;
  totalHT: number;
  prixUnitaire: number;
  formula: string;
  isfFormula?: string;
};

export type CarteriePriceOverrides = {
  impressionFeuille?: number;
  pelliculageA4?: number;
  gaufrageA4?: number;
  dorureA4?: number;
  vernisA4?: number;
  coinsParFeuille?: number;
  decoupeParPiece?: number;
  piecesParFeuille?: number;
  /** Force le moteur ISF (tests / Admin) même si grille Excel dispo */
  preferIsfImposition?: boolean;
};

export function isCarteriePricingArticle(articleId: string, category?: string): boolean {
  if (isCarteArticleId(articleId)) return true;
  return category === 'carterie' || articleId.startsWith('cv-');
}

function optionOn(raw: unknown): boolean {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return false;
  if (/^(non|no|sans|0|false|off|bord\s*carr)/i.test(s)) return false;
  if (/oui|yes|avec|1|true|on|mat|brillant|rect|verso|arrondi/i.test(s)) return true;
  return s.length > 0 && !/aucun|none|—|-/i.test(s);
}

function isCoinsArrondis(raw: unknown): boolean {
  return /arrondi/i.test(String(raw ?? ''));
}

/** Mappe config carte → ISF sur la feuille de base (A4 par défaut). */
export function carterieConfigToIsfSheetConfig(
  config: Record<string, unknown>,
  sheetFormat = 'A4 — 210×297 mm',
): Record<string, unknown> {
  return {
    ...config,
    format: sheetFormat,
    type: String(config.type ?? config.impression_type ?? 'Quadri').trim() || 'Quadri',
    matiere: config.matiere ?? config.material ?? config.support,
    grammage: config.grammage ?? config.paperWeight,
    face: resolveConfigFace(config),
    // Ne pas laisser le format carte polluer le calcul feuille
    format_largeur: undefined,
    format_hauteur: undefined,
  };
}

function resolveSheetFormatLabel(config: Record<string, unknown>): string {
  const raw = String(config.format_feuille ?? config.sheetFormat ?? config.feuille ?? '').trim();
  if (/A3\+/i.test(raw)) return 'A3+ — 320×450 mm';
  if (/\bA3\b/i.test(raw)) return 'A3 — 297×420 mm';
  if (/\bA5\b/i.test(raw)) return 'A5 — 148×210 mm';
  return 'A4 — 210×297 mm';
}

function collectSheetFinitions(
  config: Record<string, unknown>,
  params: ReturnType<typeof getCarterieRuntimeParams>,
  overrides?: CarteriePriceOverrides,
  opts?: { skipPelliculage?: boolean },
): { total: number; detail: Array<{ label: string; amount: number }> } {
  if (!params.utiliseFinitions) return { total: 0, detail: [] };
  const detail: Array<{ label: string; amount: number }> = [];
  const rv = isRectoVerso(resolveConfigFace(config));
  const faceCoeff = rv ? 2 : 1;

  const pellOn =
    !opts?.skipPelliculage
    && (optionOn(config.pelliculage)
      || optionOn(config.finition_pelliculage)
      || /pellicul/i.test(String(config.finitions ?? '')));
  if (pellOn) {
    const base = overrides?.pelliculageA4 ?? params.pelliculageA4;
    const amount = Math.round(base * faceCoeff);
    detail.push({ label: 'Pelliculage feuille', amount });
  }

  const gaufOn =
    optionOn(config.gaufrage)
    || optionOn(config.debossage)
    || /gaufrage|d[eé]boss/i.test(String(config.finitions ?? ''));
  if (gaufOn) {
    const amount = overrides?.gaufrageA4 ?? params.gaufrageA4;
    detail.push({ label: 'Gaufrage feuille', amount });
  }

  const dorOn =
    optionOn(config.dorure)
    || /dorure/i.test(String(config.finitions ?? ''));
  if (dorOn) {
    const amount = Math.round((overrides?.dorureA4 ?? params.dorureA4) * faceCoeff);
    detail.push({ label: 'Dorure feuille', amount });
  }

  const vernOn =
    optionOn(config.vernis)
    || /vernis/i.test(String(config.finitions ?? ''));
  if (vernOn) {
    const amount = Math.round((overrides?.vernisA4 ?? params.vernisA4) * faceCoeff);
    detail.push({ label: 'Vernis feuille', amount });
  }

  if (isCoinsArrondis(config.coins)) {
    const amount = overrides?.coinsParFeuille ?? params.coinsParFeuille;
    detail.push({ label: 'Coins arrondis feuille', amount });
  }

  return {
    total: detail.reduce((s, d) => s + d.amount, 0),
    detail,
  };
}

function emptyBreakdown(
  qty: number,
  surDevis: boolean,
  incomplete: boolean,
  missingField?: string,
  partial?: Partial<CarteriePriceBreakdown>,
): CarteriePriceBreakdown {
  return {
    calculable: false,
    surDevis,
    missingField: incomplete ? missingField : undefined,
    formatFini: '',
    formatFeuille: 'A4',
    piecesParFeuille: 0,
    piecesSource: 'unknown',
    prixImpressionFeuille: 0,
    prixFinitionsFeuille: 0,
    finitionsDetail: [],
    prixFeuilleTotal: 0,
    prixParPieceAvantDecoupe: 0,
    prixDecoupeParPiece: 0,
    prixUnitaireAvantRemise: 0,
    qty,
    sousTotal: 0,
    remiseRate: 0,
    remiseAmount: 0,
    totalHT: 0,
    prixUnitaire: 0,
    formula: incomplete ? `missing:${missingField}` : 'sur_devis',
    ...partial,
  };
}

function prefersExcelGrid(params: ReturnType<typeof getCarterieRuntimeParams>): boolean {
  const src = String(params.sourcePrixBase ?? '').toLowerCase();
  // Mode forcé Admin : ISF feuille uniquement (hors grille commerciale)
  if (/isf\s*uniquement|feuille\s*uniquement|imposition\s*only/i.test(src)) return false;
  return true;
}

export function computeCarteriePrice(
  config: Record<string, unknown>,
  qtyRaw = 1,
  overrides?: CarteriePriceOverrides,
): CarteriePriceBreakdown {
  const qty = Math.max(1, Math.floor(Number(qtyRaw) || 1));
  const params = getCarterieRuntimeParams();
  const formatFini = String(config.format ?? '').trim();
  const matiere = String(
    config.matiere ?? config.material ?? config.paperType ?? config.support ?? '',
  ).trim();
  const grammage = String(
    config.grammage ?? config.paperWeight ?? config.paper_weight ?? '',
  ).trim();
  const face = String(resolveConfigFace(config) ?? '').trim();

  if (!formatFini) {
    return emptyBreakdown(qty, false, true, 'format');
  }
  if (!matiere) {
    return emptyBreakdown(qty, false, true, 'matiere');
  }
  // PVC opaque/translucide utilise '1 mm' comme grammage — valide, ne pas bloquer
  const isPvcRigide = /pvc/i.test(matiere);
  if (!grammage || (/personnalis/i.test(grammage) && !isPvcRigide)) {
    return emptyBreakdown(qty, /personnalis/i.test(grammage), true, 'grammage');
  }
  if (!face) {
    return emptyBreakdown(qty, false, true, 'face');
  }

  const sheetLabel = resolveSheetFormatLabel(config);
  const sheetCode = /A3\+/i.test(sheetLabel) ? 'A3+' : /\bA3\b/i.test(sheetLabel) ? 'A3' : 'A4';

  const customW = Number(config.format_largeur ?? config.largeur_mm ?? config.card_width);
  const customH = Number(config.format_hauteur ?? config.hauteur_mm ?? config.card_height);
  const dims =
    Number.isFinite(customW) && customW > 0 && Number.isFinite(customH) && customH > 0
      ? { w: customW, h: customH }
      : parseCardDimensionsMm(formatFini);

  if (/personnalis/i.test(formatFini) && !dims) {
    return emptyBreakdown(qty, true, true, 'pieces_par_feuille', {
      formatFini,
      formula: 'capacite_a_definir',
    });
  }

  const piecesRes = resolveCarteriePiecesPerSheet(
    formatFini,
    sheetCode,
    dims,
    overrides?.piecesParFeuille ?? (Number(config.pieces_par_feuille) || null),
  );

  // —— Source commerciale PRIX 2026 (onglet Carte de visite) ——
  const useGrid =
    !overrides?.preferIsfImposition
    && prefersExcelGrid(params)
    && !/personnalis/i.test(formatFini)
    && overrides?.impressionFeuille == null;

  if (useGrid) {
    const grid = lookupCarteVisiteExcelUnitPrice(config, qty);
    if (grid.calculable) {
      // Pelliculage déjà dans la colonne Excel — extras uniquement (gaufrage, dorure…)
      const extrasFeuille = collectSheetFinitions(config, params, overrides, {
        skipPelliculage: true,
      });
      const pieces = piecesRes.pieces > 0 ? piecesRes.pieces : 10;
      const extrasParPiece =
        extrasFeuille.total > 0 ? Math.round(extrasFeuille.total / pieces) : 0;
      const finitionsDetail =
        extrasParPiece > 0
          ? extrasFeuille.detail.map((d) => ({
              label: d.label.replace(/\s*feuille$/i, '').trim() || d.label,
              amount: Math.round(d.amount / pieces),
            }))
          : [];
      const prixUnitaireAvantRemise = grid.unitPrice + extrasParPiece;
      const sousTotal = prixUnitaireAvantRemise * qty;
      return {
        calculable: true,
        surDevis: false,
        pricingMode: 'excel_grid',
        gridColumnLabel: grid.columnLabel,
        gridTierLabel: grid.tierLabel,
        formatFini,
        formatFeuille: sheetCode,
        piecesParFeuille: pieces,
        piecesSource: piecesRes.source || 'excel_grid',
        prixImpressionFeuille: grid.unitPrice,
        prixFinitionsFeuille: extrasParPiece,
        finitionsDetail,
        prixFeuilleTotal: grid.unitPrice,
        prixParPieceAvantDecoupe: grid.unitPrice,
        prixDecoupeParPiece: 0,
        prixUnitaireAvantRemise,
        qty,
        sousTotal,
        remiseRate: 0,
        remiseAmount: 0,
        totalHT: sousTotal,
        prixUnitaire: prixUnitaireAvantRemise,
        formula: `excel_cv:${grid.column ?? 'col'}@${grid.tierLabel ?? qty}=${grid.unitPrice}${extrasParPiece ? `+extras ${extrasParPiece}` : ''}`,
      };
    }
    if (grid.surDevis) {
      return emptyBreakdown(qty, true, true, grid.missingField ?? 'impression', {
        pricingMode: 'excel_grid',
        gridColumnLabel: grid.columnLabel,
        gridTierLabel: grid.tierLabel,
        formatFini,
        formula: 'excel_cv_sur_devis',
      });
    }
    // Grille incomplète → bascule ISF ci-dessous
  }

  if (piecesRes.pieces <= 0) {
    return emptyBreakdown(qty, true, true, 'pieces_par_feuille', {
      formatFini,
      formatFeuille: sheetCode,
      piecesSource: piecesRes.source,
      formula: 'capacite_a_definir',
    });
  }

  let prixImpressionFeuille = overrides?.impressionFeuille ?? 0;
  let isfFormula: string | undefined;
  const sheetQty = Math.max(1, Math.ceil(qty / piecesRes.pieces));

  if (overrides?.impressionFeuille == null) {
    if (!params.utiliseImpressionSf) {
      return emptyBreakdown(qty, true, true, 'impression');
    }
    // Palier ISF selon nb de feuilles imprimées (pas le nb de cartes)
    const isf = computeImpressionSfPrice(
      carterieConfigToIsfSheetConfig(config, sheetLabel),
      sheetQty,
    );
    if (!isf.calculable || isf.surDevis) {
      return emptyBreakdown(qty, isf.surDevis, !isf.calculable, 'impression', {
        formatFini,
        formatFeuille: sheetCode,
        piecesParFeuille: piecesRes.pieces,
        piecesSource: piecesRes.source,
        isfFormula: isf.formula,
        formula: isf.formula ?? 'isf_incomplete',
      });
    }
    prixImpressionFeuille = isf.prixUnitaire;
    isfFormula = isf.formula;
  }

  const finitions = collectSheetFinitions(config, params, overrides);
  const prixFeuilleTotal = prixImpressionFeuille + finitions.total;
  const prixParPieceAvantDecoupe = Math.round(prixFeuilleTotal / piecesRes.pieces);

  const decoupeRaw = String(config.decoupe ?? '').trim();
  const decoupeOff = /sans|non|0|off/i.test(decoupeRaw);
  const prixDecoupeParPiece =
    params.utiliseDecoupe && !decoupeOff
      ? (overrides?.decoupeParPiece ?? params.prixDecoupeParPiece)
      : overrides?.decoupeParPiece != null
        ? overrides.decoupeParPiece
        : 0;
  const prixUnitaireAvantRemise = prixParPieceAvantDecoupe + prixDecoupeParPiece;
  const sousTotal = prixUnitaireAvantRemise * qty;
  // Remise % optionnelle (Admin) — base = feuilles ISF, pas nb cartes
  const usePalier = params.utilisePalier === true;
  const remiseRate = usePalier ? impressionSfVolumeRemiseRate(sheetQty) : 0;
  const remiseAmount = usePalier ? impressionSfVolumeRemiseAmount(sousTotal, sheetQty) : 0;
  const totalHT = sousTotal - remiseAmount;
  const prixUnitaire = qty > 0 ? Math.round(totalHT / qty) : prixUnitaireAvantRemise;

  return {
    calculable: true,
    surDevis: false,
    pricingMode: 'isf_imposition',
    formatFini,
    formatFeuille: sheetCode,
    piecesParFeuille: piecesRes.pieces,
    piecesSource: piecesRes.source,
    prixImpressionFeuille,
    prixFinitionsFeuille: finitions.total,
    finitionsDetail: finitions.detail,
    prixFeuilleTotal,
    prixParPieceAvantDecoupe,
    prixDecoupeParPiece,
    prixUnitaireAvantRemise,
    qty,
    sousTotal,
    remiseRate,
    remiseAmount,
    totalHT,
    prixUnitaire,
    isfFormula,
    formula: `carterie:(${prixImpressionFeuille}+${finitions.total})/${piecesRes.pieces}+${prixDecoupeParPiece}`,
  };
}

export function carteriePriceSummaryNote(b: CarteriePriceBreakdown): string {
  if (!b.calculable) {
    if (b.missingField === 'pieces_par_feuille') {
      return 'Prix en attente — Capacité à définir (pièces / feuille)';
    }
    if (b.missingField) return `Prix en attente — champ manquant : ${b.missingField}`;
    if (b.surDevis) return 'Prix en attente — option sur devis';
    return 'Prix en attente';
  }
  if (b.pricingMode === 'excel_grid') {
    const parts = [
      `Grille PRIX 2026${b.gridColumnLabel ? ` · ${b.gridColumnLabel}` : ''}`,
      b.gridTierLabel ? `Palier ${b.gridTierLabel}` : null,
      `Unitaire : ${b.prixUnitaire.toLocaleString('fr-FR')} Ar`,
    ].filter(Boolean);
    return parts.join(' · ');
  }
  const parts = [
    `Impression feuille : ${b.prixImpressionFeuille.toLocaleString('fr-FR')} Ar`,
    ...b.finitionsDetail.map((f) => `${f.label} : ${f.amount.toLocaleString('fr-FR')} Ar`),
    `Pièces / feuille : ${b.piecesParFeuille}`,
    `Avant découpe : ${b.prixParPieceAvantDecoupe.toLocaleString('fr-FR')} Ar`,
  ];
  if (b.prixDecoupeParPiece > 0) {
    parts.push(`Découpe : ${b.prixDecoupeParPiece.toLocaleString('fr-FR')} Ar / pièce`);
  }
  return parts.join(' · ');
}

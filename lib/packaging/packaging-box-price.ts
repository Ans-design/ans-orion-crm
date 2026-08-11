/**
 * Moteur prix Boîte personnalisée (pkg-boite).
 * depenses → × (1 + bénéfice% + margeDepense%) — défaut ×1,40.
 * Impression SF (A4 × équiv) + Finitions & Reliures + déchets matière.
 */
import {
  calculateBoxPackaging,
  normalizeBoxStructure,
  type BoxCalculationResult,
} from '@/lib/packaging/box-calculation';
import {
  findPackagingTemplate,
  getPackagingMarginDefaults,
  type PackagingBoxTemplateDefault,
} from '@/lib/packaging/packaging-admin-defaults';
import {
  resolveFormatOverride,
  surfaceToA4Equivalent,
  surfaceM2FromFormatEqMm,
  type PackagingArrondiMode,
} from '@/lib/packaging/packaging-a4-equivalence';
import { getEffectiveFinitionBasePrices } from '@/lib/finition/finition-price-catalog';
import {
  resolveImpressionSfPaperPriceKey,
} from '@/lib/pricing/impression-sf-pricing';
import { IMPRESSION_SF_PAPER_TARIFFS } from '@/lib/data/impression-sf-paper-tariffs';
import { pickTierUnitPrice } from '@/lib/pricing/tier-price';

export type PackagingBoxPriceInput = {
  longueur?: number;
  profondeur?: number;
  hauteur?: number;
  /** mm | cm — défaut mm */
  unite?: 'mm' | 'cm';
  typeBoite?: string;
  structure?: string;
  matiere?: string;
  grammage?: string;
  face?: string;
  qty?: number;
  finitions?: string[];
  /** Format forcé : Auto | A4 | A3 | A2 | A1 | A0 */
  formatEquivalent?: string | null;
  /** Surface manuelle m² (si gabarit custom) */
  surfaceManuelleM2?: number | null;
  margeDechetsPct?: number;
  beneficePct?: number;
  margeDepensePct?: number;
  arrondiMode?: PackagingArrondiMode;
  /** Overrides tests / Admin */
  prixA4Impression?: number;
  pelliculageA4?: number;
  gaufrageA4?: number;
  dorureA4?: number;
  vernisA4?: number;
  rainageA4?: number;
  decoupePerM2?: number;
  collageA4?: number;
  faconnageForfait?: number;
};

export type PackagingFinitionLine = {
  label: string;
  unit: string;
  unitPriceA4: number;
  amount: number;
};

export type PackagingBoxPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  reason?: string;
  typeBoite: string;
  longueurMm: number;
  profondeurMm: number;
  hauteurMm: number;
  surfaceTheoriqueM2: number;
  surfaceAvecDechetsM2: number;
  margeDechetsPct: number;
  equivA4: number;
  formatEquivalent: string;
  prixA4Impression: number;
  prixImpressionBrut: number;
  prixDechetsMatiere: number;
  prixImpressionAvecDechets: number;
  finitionLines: PackagingFinitionLine[];
  prixFinitions: number;
  prixFaconnage: number;
  sousTotalDepenses: number;
  beneficePct: number;
  benefice: number;
  margeDepensePct: number;
  margeDepense: number;
  prixUnitaire: number;
  qty: number;
  prixTotal: number;
  formula: string;
  boxGeometry?: BoxCalculationResult | null;
  template?: PackagingBoxTemplateDefault | null;
};

function toMm(value: number, unite: 'mm' | 'cm'): number {
  if (!(value > 0)) return 0;
  return unite === 'cm' ? value * 10 : value;
}

function closedBoxSurfaceM2(Lmm: number, Pmm: number, Hmm: number): number {
  const L = Lmm / 1000;
  const P = Pmm / 1000;
  const H = Hmm / 1000;
  return 2 * (L * P + L * H + P * H);
}

export function calculatePackagingSurface(input: {
  longueur: number;
  profondeur: number;
  hauteur: number;
  unite?: 'mm' | 'cm';
  typeBoite?: string;
  structure?: string;
  surfaceManuelleM2?: number | null;
  margeDechetsPct?: number;
  coeffRabats?: number;
  coeffLanguettes?: number;
  coeffCollage?: number;
}): {
  surfaceTheoriqueM2: number;
  surfaceAvecDechetsM2: number;
  margeDechetsPct: number;
  boxGeometry: BoxCalculationResult | null;
  template: PackagingBoxTemplateDefault | null;
  typeBoite: string;
} {
  const unite = input.unite ?? 'mm';
  const L = toMm(input.longueur, unite);
  const P = toMm(input.profondeur, unite);
  const H = toMm(input.hauteur, unite);
  const typeBoite = String(input.structure || input.typeBoite || 'Boîte rabats droits').trim();
  const template = findPackagingTemplate(typeBoite) ?? null;
  const margeDechetsPct =
    input.margeDechetsPct
    ?? template?.margeDechetsPct
    ?? getPackagingMarginDefaults().margeDechetsPct;

  if (input.surfaceManuelleM2 != null && input.surfaceManuelleM2 > 0) {
    const surfaceTheoriqueM2 = input.surfaceManuelleM2;
    return {
      surfaceTheoriqueM2,
      surfaceAvecDechetsM2: surfaceTheoriqueM2 * (1 + margeDechetsPct / 100),
      margeDechetsPct,
      boxGeometry: null,
      template,
      typeBoite,
    };
  }

  const formuleKey = template?.formuleKey;
  let surfaceTheoriqueM2 = 0;
  let boxGeometry: BoxCalculationResult | null = null;

  if (formuleKey === 'closed_box_2faces' || formuleKey === 'custom_manual') {
    surfaceTheoriqueM2 = closedBoxSurfaceM2(L, P, H);
  } else if (L > 0 && P > 0 && H > 0) {
    boxGeometry = calculateBoxPackaging({
      structure: typeBoite,
      longueur: L,
      profondeur: P,
      hauteur: H,
    });
    if (boxGeometry) {
      surfaceTheoriqueM2 = boxGeometry.surfaceFactureeM2 > 0
        ? boxGeometry.surfaceFactureeM2
        : boxGeometry.surfaceM2;
    } else {
      surfaceTheoriqueM2 = closedBoxSurfaceM2(L, P, H);
    }
  }

  const cR = input.coeffRabats ?? template?.coeffRabats ?? 1;
  const cL = input.coeffLanguettes ?? template?.coeffLanguettes ?? 1;
  const cC = input.coeffCollage ?? template?.coeffCollage ?? 1;
  surfaceTheoriqueM2 *= cR * cL * cC;

  return {
    surfaceTheoriqueM2,
    surfaceAvecDechetsM2: surfaceTheoriqueM2 * (1 + margeDechetsPct / 100),
    margeDechetsPct,
    boxGeometry,
    template,
    typeBoite,
  };
}

function resolveA4ImpressionPrice(
  matiere: string,
  grammage: string,
  qty: number,
  override?: number,
): number {
  if (override != null && override > 0) return Math.round(override);
  const key = resolveImpressionSfPaperPriceKey(
    matiere,
    grammage,
    'Impression numérique couleur',
  );
  if (!key) return 0;
  const entry = IMPRESSION_SF_PAPER_TARIFFS[key];
  if (!entry) return 0;
  return Math.round(pickTierUnitPrice(entry.tiers, Math.max(1, qty)));
}

function matchFinitionUnitPrice(
  label: string,
  overrides: PackagingBoxPriceInput,
): { unitPriceA4: number; unit: string } | null {
  const P = getEffectiveFinitionBasePrices();
  const s = label.toLowerCase();

  if (/pellicul/.test(s)) {
    return { unitPriceA4: overrides.pelliculageA4 ?? P.pelliculageA4Recto, unit: 'A4' };
  }
  if (/gaufrage|d[eé]bossage/.test(s)) {
    return { unitPriceA4: overrides.gaufrageA4 ?? P.gaufrageA4, unit: 'A4' };
  }
  if (/dorure/.test(s)) {
    return { unitPriceA4: overrides.dorureA4 ?? P.dorureStandardA4, unit: 'A4' };
  }
  if (/vernis/.test(s)) {
    return { unitPriceA4: overrides.vernisA4 ?? P.vernisA4Recto, unit: 'A4' };
  }
  if (/rainage|pliage/.test(s)) {
    return { unitPriceA4: overrides.rainageA4 ?? P.rainagePerPliA4, unit: 'A4' };
  }
  if (/collage/.test(s)) {
    return { unitPriceA4: overrides.collageA4 ?? P.collageSimpleA4, unit: 'A4' };
  }
  if (/plastif/.test(s)) {
    return { unitPriceA4: P.plastificationA4, unit: 'A4' };
  }
  if (/d[eé]coupe/.test(s)) {
    const perM2 = overrides.decoupePerM2 ?? P.decoupePhotoboothPerM2;
    return { unitPriceA4: 0, unit: `m2:${perM2}` };
  }
  return null;
}

export function calculatePackagingBoxPrice(input: PackagingBoxPriceInput): PackagingBoxPriceResult {
  const margin = getPackagingMarginDefaults();
  const qty = Math.max(1, Math.round(Number(input.qty) || 1));
  const unite = input.unite ?? 'mm';
  const L = toMm(Number(input.longueur) || 0, unite);
  const P = toMm(Number(input.profondeur) || 0, unite);
  const H = toMm(Number(input.hauteur) || 0, unite);
  const typeBoite = String(input.structure || input.typeBoite || 'Boîte rabats droits').trim();
  const formatOverride = resolveFormatOverride(input.formatEquivalent);

  const beneficePct = input.beneficePct ?? margin.beneficePct;
  const margeDepensePct = input.margeDepensePct ?? margin.margeDepensePct;
  const arrondiMode = input.arrondiMode ?? margin.arrondiMode;

  const empty = (reason: string, partial?: Partial<PackagingBoxPriceResult>): PackagingBoxPriceResult => ({
    calculable: false,
    surDevis: true,
    reason,
    typeBoite,
    longueurMm: L,
    profondeurMm: P,
    hauteurMm: H,
    surfaceTheoriqueM2: 0,
    surfaceAvecDechetsM2: 0,
    margeDechetsPct: input.margeDechetsPct ?? margin.margeDechetsPct,
    equivA4: 0,
    formatEquivalent: '—',
    prixA4Impression: 0,
    prixImpressionBrut: 0,
    prixDechetsMatiere: 0,
    prixImpressionAvecDechets: 0,
    finitionLines: [],
    prixFinitions: 0,
    prixFaconnage: 0,
    sousTotalDepenses: 0,
    beneficePct,
    benefice: 0,
    margeDepensePct,
    margeDepense: 0,
    prixUnitaire: 0,
    qty,
    prixTotal: 0,
    formula: '',
    boxGeometry: null,
    template: null,
    ...partial,
  });

  // Format forcé (ex. A0) : pas besoin des dimensions pour le cas métier d’acceptation
  let equivA4 = 0;
  let formatEquivalent = '—';
  let surfaceTheoriqueM2 = 0;
  let surfaceAvecDechetsM2 = 0;
  let boxGeometry: BoxCalculationResult | null = null;
  let template: PackagingBoxTemplateDefault | null = null;
  let margeDechetsPct = input.margeDechetsPct ?? margin.margeDechetsPct;

  if (formatOverride) {
    equivA4 = formatOverride.equivA4;
    formatEquivalent = formatOverride.formatEquivalent;
    // Surface informative ≈ A4 × facteur (sans imposer dims)
    surfaceTheoriqueM2 = equivA4 * 0.210 * 0.297;
    surfaceAvecDechetsM2 = surfaceTheoriqueM2; // déchets appliqués sur coût impression, pas sur surf. finitions (exemple métier)
    template = findPackagingTemplate(typeBoite) ?? null;
    if (template) margeDechetsPct = input.margeDechetsPct ?? template.margeDechetsPct;
  } else {
    if (!(L > 0 && P > 0 && H > 0) && !(input.surfaceManuelleM2 != null && input.surfaceManuelleM2 > 0)) {
      return empty('Dimensions L×P×H requises (ou format équivalent / surface manuelle)');
    }
    const surf = calculatePackagingSurface({
      longueur: L,
      profondeur: P,
      hauteur: H,
      unite: 'mm',
      typeBoite,
      structure: typeBoite,
      surfaceManuelleM2: input.surfaceManuelleM2,
      margeDechetsPct: input.margeDechetsPct,
    });
    surfaceTheoriqueM2 = surf.surfaceTheoriqueM2;
    surfaceAvecDechetsM2 = surf.surfaceAvecDechetsM2;
    margeDechetsPct = surf.margeDechetsPct;
    boxGeometry = surf.boxGeometry;
    template = surf.template;
    if (!(surfaceTheoriqueM2 > 0)) {
      return empty('Surface calculée nulle — vérifier gabarit / dimensions', { template, boxGeometry });
    }
    const eq = surfaceToA4Equivalent(surfaceAvecDechetsM2, arrondiMode);
    equivA4 = eq.equivA4;
    formatEquivalent = eq.formatEquivalent;
  }

  if (!(equivA4 > 0)) {
    return empty('Équivalent A4 impossible', { template, boxGeometry });
  }

  const matiere = String(input.matiere ?? 'PCB').trim();
  const grammage = String(input.grammage ?? '300g').trim();
  const prixA4Impression = resolveA4ImpressionPrice(matiere, grammage, qty, input.prixA4Impression);
  if (!(prixA4Impression > 0)) {
    return empty('Matière / grammage sans tarif Impression sans finition', {
      template,
      boxGeometry,
      surfaceTheoriqueM2,
      surfaceAvecDechetsM2,
      equivA4,
      formatEquivalent,
      margeDechetsPct,
    });
  }

  const prixImpressionBrut = Math.round(prixA4Impression * equivA4);
  const prixDechetsMatiere = Math.round(prixImpressionBrut * (margeDechetsPct / 100));
  const prixImpressionAvecDechets = prixImpressionBrut + prixDechetsMatiere;

  const finitions = Array.isArray(input.finitions)
    ? input.finitions
    : String(input.finitions ?? '')
        .split(/[,;|]/)
        .map((x) => x.trim())
        .filter(Boolean);

  const finitionLines: PackagingFinitionLine[] = [];
  for (const fin of finitions) {
    const matched = matchFinitionUnitPrice(fin, input);
    if (!matched) continue;
    if (matched.unit.startsWith('m2:')) {
      const perM2 = Number(matched.unit.slice(3)) || 0;
      const area = formatOverride ? surfaceTheoriqueM2 : surfaceAvecDechetsM2;
      const amount = Math.round(perM2 * area);
      finitionLines.push({ label: fin, unit: 'm²', unitPriceA4: perM2, amount });
    } else {
      const amount = Math.round(matched.unitPriceA4 * equivA4);
      finitionLines.push({
        label: fin,
        unit: matched.unit,
        unitPriceA4: matched.unitPriceA4,
        amount,
      });
    }
  }
  const prixFinitions = finitionLines.reduce((s, l) => s + l.amount, 0);
  const prixFaconnage = Math.round(Number(input.faconnageForfait) || 0);

  const sousTotalDepenses = prixImpressionAvecDechets + prixFinitions + prixFaconnage;
  const benefice = Math.round(sousTotalDepenses * (beneficePct / 100));
  const margeDepense = Math.round(sousTotalDepenses * (margeDepensePct / 100));
  const prixUnitaire = sousTotalDepenses + benefice + margeDepense;
  const prixTotal = prixUnitaire * qty;

  return {
    calculable: prixUnitaire > 0,
    surDevis: !(prixUnitaire > 0),
    typeBoite,
    longueurMm: L,
    profondeurMm: P,
    hauteurMm: H,
    surfaceTheoriqueM2,
    surfaceAvecDechetsM2,
    margeDechetsPct,
    equivA4,
    formatEquivalent,
    prixA4Impression,
    prixImpressionBrut,
    prixDechetsMatiere,
    prixImpressionAvecDechets,
    finitionLines,
    prixFinitions,
    prixFaconnage,
    sousTotalDepenses,
    beneficePct,
    benefice,
    margeDepensePct,
    margeDepense,
    prixUnitaire,
    qty,
    prixTotal,
    formula:
      `ISF ${prixA4Impression}×${equivA4}`
      + ` + déchets ${margeDechetsPct}%`
      + ` + finitions ${prixFinitions}`
      + ` → dépenses ${sousTotalDepenses}`
      + ` × (1+${beneficePct}%+${margeDepensePct}%)`,
    boxGeometry,
    template,
  };
}

export function isPackagingBoxPricingArticle(articleId: string): boolean {
  return articleId === 'pkg-boite';
}

function normalizeFinitionsFromConfig(config: Record<string, unknown>): string[] {
  const raw = config.finitions ?? config.finition ?? config.finition_surface;
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  return String(raw ?? '')
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Entrée POS / devis → moteur packaging boîte */
export function calculatePackagingBoxPriceFromConfig(
  config: Record<string, unknown>,
  qtyFallback = 1,
): PackagingBoxPriceResult {
  const structureRaw = String(config.structure ?? config.typeBoite ?? '').trim();
  const structure = expandPackagingStructureAliases(structureRaw) || structureRaw;
  const qty = Math.max(
    1,
    Math.round(Number(config.qty ?? config.quantite ?? qtyFallback) || qtyFallback),
  );
  const formatEqRaw = String(config.formatEquivalent ?? config.format_equivalent ?? 'Auto');
  const isPerso = /personnalis|sur mesure/i.test(formatEqRaw);
  const surfaceFromPerso = isPerso
    ? surfaceM2FromFormatEqMm(config.format_eq_longueur, config.format_eq_largeur)
    : null;
  const surfaceManuelleFallback =
    config.surfaceManuelleM2 != null
      ? Number(config.surfaceManuelleM2)
      : config.surface_manuelle_m2 != null
        ? Number(config.surface_manuelle_m2)
        : null;

  return calculatePackagingBoxPrice({
    longueur: Number(config.longueur) || 0,
    profondeur: Number(config.profondeur) || 0,
    hauteur: Number(config.hauteur) || 0,
    unite: 'mm',
    typeBoite: structure,
    structure,
    matiere: String(config.matiere ?? ''),
    grammage: String(config.grammage ?? ''),
    face: String(config.face ?? ''),
    qty,
    finitions: normalizeFinitionsFromConfig(config),
    // Personnalisé → pas d’override ISO ; surface manuelle L×l
    formatEquivalent: isPerso ? 'Auto' : formatEqRaw,
    surfaceManuelleM2: surfaceFromPerso ?? surfaceManuelleFallback,
  });
}

export function packagingBoxPriceSummaryNote(r: PackagingBoxPriceResult): string {
  if (!r.calculable) {
    return r.reason
      ? `Packaging — ${r.reason}`
      : 'Packaging — prix en attente (config incomplète)';
  }
  const fins = r.finitionLines.length
    ? ` · ${r.finitionLines.map((f) => f.label).join(', ')}`
    : '';
  return (
    `Équiv. ${r.formatEquivalent} (${r.equivA4}×A4)`
    + ` · ISF ${r.prixA4Impression} Ar`
    + ` · dépenses ${r.sousTotalDepenses} Ar`
    + ` · bénéfice ${r.beneficePct}% + marge ${r.margeDepensePct}%`
    + fins
  );
}

/** Alias structure POS → clés connues */
export function expandPackagingStructureAliases(raw: string): string {
  const s = raw.trim();
  const map: Record<string, string> = {
    'Boîte simple': 'Boîte simple',
    'boîte simple': 'Boîte simple',
    'Boîte avec couvercle': 'Boîte fond + couvercle',
    'Boîte cloche': 'Boîte oreiller',
    'Boîte fourreau': 'Fourreau',
    'Boîte personnalisée': 'Boîte personnalisée',
  };
  return map[s] ?? s;
}

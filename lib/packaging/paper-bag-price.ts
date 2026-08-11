/**
 * Moteur prix Sac en papier personnalisé (pkg-sac).
 * Surface développée + ISF A4×équiv + finitions + accessoires → × (1+bénéfice+marge).
 */
import {
  findPaperBagTemplate,
  getPaperBagAccessories,
  getPaperBagMarginDefaults,
  type PaperBagTemplateDefault,
} from '@/lib/packaging/paper-bag-admin-defaults';
import {
  resolveFormatOverride,
  surfaceToA4Equivalent,
  surfaceM2FromFormatEqMm,
  type PackagingArrondiMode,
} from '@/lib/packaging/packaging-a4-equivalence';
import { getEffectiveFinitionBasePrices } from '@/lib/finition/finition-price-catalog';
import { resolveImpressionSfPaperPriceKey } from '@/lib/pricing/impression-sf-pricing';
import { IMPRESSION_SF_PAPER_TARIFFS } from '@/lib/data/impression-sf-paper-tariffs';
import { pickTierUnitPrice } from '@/lib/pricing/tier-price';

export type PaperBagPriceInput = {
  longueur?: number;
  profondeur?: number;
  hauteur?: number;
  unite?: 'mm' | 'cm';
  typeSac?: string;
  format?: string;
  matiere?: string;
  grammage?: string;
  face?: string;
  qty?: number;
  finitions?: string[];
  accessoires?: string[];
  poignees?: string;
  oeillets?: number | string;
  formatEquivalent?: string | null;
  margeDechetsPct?: number;
  beneficePct?: number;
  margeDepensePct?: number;
  arrondiMode?: PackagingArrondiMode;
  /** Overrides Admin / tests */
  prixA4Impression?: number;
  pelliculageA4?: number;
  gaufrageA4?: number;
  dorureA4?: number;
  vernisA4?: number;
  rainageA4?: number;
  collageA4?: number;
  decoupePerM2?: number;
  faconnageForfait?: number;
  coefficientFond?: number;
  rabatHautMm?: number;
  patteCollageMm?: number;
};

export type PaperBagFinitionLine = {
  label: string;
  unit: string;
  unitPriceA4: number;
  amount: number;
};

export type PaperBagAccessoryLine = {
  label: string;
  unit: string;
  unitPrice: number;
  qty: number;
  amount: number;
};

export type PaperBagSurfaceResult = {
  largeurDeveloppeeMm: number;
  hauteurDeveloppeeMm: number;
  surfaceDeveloppeeM2: number;
  surfaceAvecDechetsM2: number;
  margeDechetsPct: number;
  fondMm: number;
  template: PaperBagTemplateDefault | null;
  typeSac: string;
};

export type PaperBagPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  reason?: string;
  typeSac: string;
  longueurMm: number;
  profondeurMm: number;
  hauteurMm: number;
  largeurDeveloppeeMm: number;
  hauteurDeveloppeeMm: number;
  surfaceDeveloppeeM2: number;
  surfaceAvecDechetsM2: number;
  margeDechetsPct: number;
  equivA4: number;
  formatEquivalent: string;
  prixA4Impression: number;
  prixImpressionBrut: number;
  prixDechetsMatiere: number;
  prixImpressionAvecDechets: number;
  finitionLines: PaperBagFinitionLine[];
  prixFinitions: number;
  prixFaconnage: number;
  accessoryLines: PaperBagAccessoryLine[];
  prixAccessoires: number;
  sousTotalDepenses: number;
  beneficePct: number;
  benefice: number;
  margeDepensePct: number;
  margeDepense: number;
  prixUnitaire: number;
  qty: number;
  prixTotal: number;
  formula: string;
  template?: PaperBagTemplateDefault | null;
};

function toMm(value: number, unite: 'mm' | 'cm'): number {
  if (!(value > 0)) return 0;
  return unite === 'cm' ? value * 10 : value;
}

/** Parse « S (220×100×310mm) » ou « 250×100×300 » → L,P,H mm */
export function parsePaperBagFormatDims(raw: unknown): { L: number; P: number; H: number } | null {
  const s = String(raw ?? '').trim();
  if (!s || /personnalis/i.test(s)) return null;
  const m = s.replace(/,/g, '.').match(
    /(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)/,
  );
  if (!m) return null;
  return { L: parseFloat(m[1]!), P: parseFloat(m[2]!), H: parseFloat(m[3]!) };
}

export function calculatePaperBagSurface(input: {
  longueur: number;
  profondeur: number;
  hauteur: number;
  unite?: 'mm' | 'cm';
  typeSac?: string;
  margeDechetsPct?: number;
  coefficientFond?: number;
  rabatHautMm?: number;
  patteCollageMm?: number;
}): PaperBagSurfaceResult {
  const unite = input.unite ?? 'mm';
  const L = toMm(Number(input.longueur) || 0, unite);
  const P = toMm(Number(input.profondeur) || 0, unite);
  const H = toMm(Number(input.hauteur) || 0, unite);
  const typeSac = String(input.typeSac ?? 'Sac papier avec soufflet').trim();
  const template = findPaperBagTemplate(typeSac);
  const coeffFond = input.coefficientFond ?? template?.coefficientFond ?? 0.85;
  const rabatHautMm = input.rabatHautMm ?? template?.rabatHautMm ?? 30;
  const patteCollageMm = input.patteCollageMm ?? template?.patteCollageMm ?? 20;
  const margeDechetsPct =
    input.margeDechetsPct ?? template?.margeDechetsPct ?? getPaperBagMarginDefaults().margeDechetsPct;

  const fondMm = P * coeffFond;
  const largeurDeveloppeeMm = 2 * L + 2 * P + patteCollageMm;
  const hauteurDeveloppeeMm = H + rabatHautMm + fondMm;
  const surfaceDeveloppeeM2 =
    L > 0 && P >= 0 && H > 0
      ? (largeurDeveloppeeMm / 1000) * (hauteurDeveloppeeMm / 1000)
      : 0;

  return {
    largeurDeveloppeeMm,
    hauteurDeveloppeeMm,
    surfaceDeveloppeeM2,
    surfaceAvecDechetsM2: surfaceDeveloppeeM2 * (1 + margeDechetsPct / 100),
    margeDechetsPct,
    fondMm,
    template,
    typeSac,
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

function matchFinition(
  label: string,
  overrides: PaperBagPriceInput,
): { unitPriceA4: number; unit: string } | null {
  const P = getEffectiveFinitionBasePrices();
  const s = label.toLowerCase();
  if (/pellicul/.test(s)) return { unitPriceA4: overrides.pelliculageA4 ?? P.pelliculageA4Recto, unit: 'A4' };
  if (/gaufrage|d[eé]bossage/.test(s)) return { unitPriceA4: overrides.gaufrageA4 ?? P.gaufrageA4, unit: 'A4' };
  if (/dorure/.test(s)) return { unitPriceA4: overrides.dorureA4 ?? P.dorureStandardA4, unit: 'A4' };
  if (/vernis/.test(s)) return { unitPriceA4: overrides.vernisA4 ?? P.vernisA4Recto, unit: 'A4' };
  if (/rainage|pliage/.test(s)) return { unitPriceA4: overrides.rainageA4 ?? P.rainagePerPliA4, unit: 'A4' };
  if (/collage/.test(s)) return { unitPriceA4: overrides.collageA4 ?? P.collageSimpleA4, unit: 'A4' };
  if (/plastif/.test(s)) return { unitPriceA4: P.plastificationA4, unit: 'A4' };
  if (/perforation/.test(s)) return { unitPriceA4: P.decoupeDroitePapier, unit: 'piece' };
  if (/d[eé]coupe/.test(s)) {
    const perM2 = overrides.decoupePerM2 ?? P.decoupePhotoboothPerM2;
    return { unitPriceA4: 0, unit: `m2:${perM2}` };
  }
  if (/[oœ]illet/.test(s)) return { unitPriceA4: 0, unit: 'accessory' };
  return null;
}

function resolveAccessoryLines(
  labels: string[],
  oeilletsCount: number,
): PaperBagAccessoryLine[] {
  const catalog = getPaperBagAccessories();
  const lines: PaperBagAccessoryLine[] = [];
  for (const raw of labels) {
    const s = raw.trim();
    if (!s || /sans/i.test(s)) continue;
    const hit =
      catalog.find((a) => a.accessoire.toLowerCase() === s.toLowerCase())
      ?? catalog.find((a) => s.toLowerCase().includes(a.accessoire.toLowerCase())
        || a.accessoire.toLowerCase().includes(s.toLowerCase()));
    if (!hit) continue;
    const qty = /oeillet|[oœ]illet/i.test(hit.accessoire) ? Math.max(1, oeilletsCount || 2) : 1;
    lines.push({
      label: hit.accessoire,
      unit: hit.unite,
      unitPrice: hit.prixHt,
      qty,
      amount: Math.round(hit.prixHt * qty),
    });
  }
  return lines;
}

export function calculatePaperBagPrice(input: PaperBagPriceInput): PaperBagPriceResult {
  const margin = getPaperBagMarginDefaults();
  const qty = Math.max(1, Math.round(Number(input.qty) || 1));
  const unite = input.unite ?? 'mm';
  let L = toMm(Number(input.longueur) || 0, unite);
  let P = toMm(Number(input.profondeur) || 0, unite);
  let H = toMm(Number(input.hauteur) || 0, unite);
  if (!(L > 0 && H > 0)) {
    const parsed = parsePaperBagFormatDims(input.format);
    if (parsed) {
      L = parsed.L;
      P = parsed.P;
      H = parsed.H;
    }
  }
  const typeSac = String(input.typeSac ?? 'Sac papier avec soufflet').trim();
  const formatOverride = resolveFormatOverride(input.formatEquivalent);
  const beneficePct = input.beneficePct ?? margin.beneficePct;
  const margeDepensePct = input.margeDepensePct ?? margin.margeDepensePct;
  const arrondiMode = input.arrondiMode ?? margin.arrondiMode;

  const empty = (reason: string, partial?: Partial<PaperBagPriceResult>): PaperBagPriceResult => ({
    calculable: false,
    surDevis: true,
    reason,
    typeSac,
    longueurMm: L,
    profondeurMm: P,
    hauteurMm: H,
    largeurDeveloppeeMm: 0,
    hauteurDeveloppeeMm: 0,
    surfaceDeveloppeeM2: 0,
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
    accessoryLines: [],
    prixAccessoires: 0,
    sousTotalDepenses: 0,
    beneficePct,
    benefice: 0,
    margeDepensePct,
    margeDepense: 0,
    prixUnitaire: 0,
    qty,
    prixTotal: 0,
    formula: '',
    template: null,
    ...partial,
  });

  let equivA4 = 0;
  let formatEquivalent = '—';
  let surfaceDeveloppeeM2 = 0;
  let surfaceAvecDechetsM2 = 0;
  let largeurDeveloppeeMm = 0;
  let hauteurDeveloppeeMm = 0;
  let template: PaperBagTemplateDefault | null = null;
  let margeDechetsPct = input.margeDechetsPct ?? margin.margeDechetsPct;

  if (formatOverride) {
    equivA4 = formatOverride.equivA4;
    formatEquivalent = formatOverride.formatEquivalent;
    surfaceDeveloppeeM2 = equivA4 * 0.210 * 0.297;
    surfaceAvecDechetsM2 = surfaceDeveloppeeM2;
    template = findPaperBagTemplate(typeSac);
    if (template) margeDechetsPct = input.margeDechetsPct ?? template.margeDechetsPct;
  } else {
    if (!(L > 0 && H > 0)) {
      return empty('Dimensions L×P×H requises (ou format / format équivalent)');
    }
    const surf = calculatePaperBagSurface({
      longueur: L,
      profondeur: P,
      hauteur: H,
      unite: 'mm',
      typeSac,
      margeDechetsPct: input.margeDechetsPct,
      coefficientFond: input.coefficientFond,
      rabatHautMm: input.rabatHautMm,
      patteCollageMm: input.patteCollageMm,
    });
    surfaceDeveloppeeM2 = surf.surfaceDeveloppeeM2;
    surfaceAvecDechetsM2 = surf.surfaceAvecDechetsM2;
    margeDechetsPct = surf.margeDechetsPct;
    largeurDeveloppeeMm = surf.largeurDeveloppeeMm;
    hauteurDeveloppeeMm = surf.hauteurDeveloppeeMm;
    template = surf.template;
    if (!(surfaceDeveloppeeM2 > 0)) {
      return empty('Surface calculée nulle — vérifier gabarit / dimensions', { template });
    }
    const eq = surfaceToA4Equivalent(surfaceAvecDechetsM2, arrondiMode);
    equivA4 = eq.equivA4;
    formatEquivalent = eq.formatEquivalent;
  }

  if (!(equivA4 > 0)) {
    return empty('Équivalent A4 impossible', { template });
  }

  const matiere = String(input.matiere ?? 'PCB').trim();
  const grammage = String(input.grammage ?? '300g').trim();
  const prixA4Impression = resolveA4ImpressionPrice(matiere, grammage, qty, input.prixA4Impression);
  if (!(prixA4Impression > 0)) {
    return empty('Matière / grammage sans tarif Impression sans finition', {
      template,
      surfaceDeveloppeeM2,
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

  const finitionLines: PaperBagFinitionLine[] = [];
  for (const fin of finitions) {
    const matched = matchFinition(fin, input);
    if (!matched || matched.unit === 'accessory') continue;
    if (matched.unit.startsWith('m2:')) {
      const perM2 = Number(matched.unit.slice(3)) || 0;
      const area = formatOverride ? surfaceDeveloppeeM2 : surfaceAvecDechetsM2;
      const amount = Math.round(perM2 * area);
      finitionLines.push({ label: fin, unit: 'm²', unitPriceA4: perM2, amount });
    } else if (matched.unit === 'piece') {
      finitionLines.push({
        label: fin,
        unit: 'pièce',
        unitPriceA4: matched.unitPriceA4,
        amount: Math.round(matched.unitPriceA4),
      });
    } else {
      finitionLines.push({
        label: fin,
        unit: matched.unit,
        unitPriceA4: matched.unitPriceA4,
        amount: Math.round(matched.unitPriceA4 * equivA4),
      });
    }
  }
  const prixFinitions = finitionLines.reduce((s, l) => s + l.amount, 0);
  const prixFaconnage = Math.round(Number(input.faconnageForfait) || 0);

  const accLabels = [
    ...(Array.isArray(input.accessoires) ? input.accessoires : []),
    ...(input.poignees && !/sans/i.test(String(input.poignees)) ? [String(input.poignees)] : []),
  ];
  const oeilletsCount = Math.max(0, Math.round(Number(input.oeillets) || 0));
  if (oeilletsCount > 0 && !accLabels.some((a) => /[oœ]illet/i.test(a))) {
    accLabels.push('Œillet métallique');
  }
  const accessoryLines = resolveAccessoryLines(accLabels, oeilletsCount || 2);
  const prixAccessoires = accessoryLines.reduce((s, l) => s + l.amount, 0);

  const sousTotalDepenses =
    prixImpressionAvecDechets + prixFinitions + prixFaconnage + prixAccessoires;
  const benefice = Math.round(sousTotalDepenses * (beneficePct / 100));
  const margeDepense = Math.round(sousTotalDepenses * (margeDepensePct / 100));
  const prixUnitaire = sousTotalDepenses + benefice + margeDepense;

  return {
    calculable: prixUnitaire > 0,
    surDevis: !(prixUnitaire > 0),
    typeSac,
    longueurMm: L,
    profondeurMm: P,
    hauteurMm: H,
    largeurDeveloppeeMm,
    hauteurDeveloppeeMm,
    surfaceDeveloppeeM2,
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
    accessoryLines,
    prixAccessoires,
    sousTotalDepenses,
    beneficePct,
    benefice,
    margeDepensePct,
    margeDepense,
    prixUnitaire,
    qty,
    prixTotal: prixUnitaire * qty,
    formula:
      `ISF ${prixA4Impression}×${equivA4}`
      + ` + déchets ${margeDechetsPct}%`
      + ` + finitions ${prixFinitions}`
      + ` + acc ${prixAccessoires}`
      + ` → dépenses ${sousTotalDepenses}`
      + ` × (1+${beneficePct}%+${margeDepensePct}%)`,
    template,
  };
}

export function calculatePaperBagPriceFromConfig(
  config: Record<string, unknown>,
  qtyFallback = 1,
): PaperBagPriceResult {
  const qty = Math.max(1, Math.round(Number(config.qty ?? qtyFallback) || qtyFallback));
  const asList = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map(String).filter(Boolean);
    return String(v ?? '')
      .split(/[,;|]/)
      .map((x) => x.trim())
      .filter(Boolean);
  };

  let typeSac = String(config.type_sac ?? config.typeSac ?? '').trim();
  if (!typeSac) {
    const poig = String(config.poignees ?? '');
    if (/corde|cordon/i.test(poig)) typeSac = 'Sac luxe avec poignées corde';
    else if (/torsad/i.test(poig)) typeSac = 'Sac avec poignées torsadées';
    else if (/plate/i.test(poig)) typeSac = 'Sac avec poignées plates';
    else typeSac = 'Sac papier avec soufflet';
  }

  const formatEqRaw = String(config.formatEquivalent ?? config.format_equivalent ?? 'Auto');
  const isPerso = /personnalis|sur mesure/i.test(formatEqRaw);
  const surfaceFromPerso = isPerso
    ? surfaceM2FromFormatEqMm(config.format_eq_longueur, config.format_eq_largeur)
    : null;
  // Surface L×l → équiv. ISO pour le moteur sac (override format)
  const formatEquivalent =
    surfaceFromPerso != null && surfaceFromPerso > 0
      ? surfaceToA4Equivalent(surfaceFromPerso, 'ceil_iso_format').formatEquivalent
      : isPerso
        ? 'Auto'
        : formatEqRaw;

  return calculatePaperBagPrice({
    longueur: Number(config.longueur) || 0,
    profondeur: Number(config.profondeur) || 0,
    hauteur: Number(config.hauteur) || 0,
    format: String(config.format ?? ''),
    typeSac,
    matiere: String(config.matiere ?? 'Kraft brun'),
    grammage: String(config.grammage ?? '170g'),
    face: String(config.face ?? 'Recto'),
    qty,
    finitions: asList(config.finitions),
    accessoires: asList(config.accessoires),
    poignees: String(config.poignees ?? ''),
    oeillets: (config.oeillets ?? config.nombre_oeillets) as string | number | undefined,
    formatEquivalent,
  });
}

export function isPaperBagPricingArticle(articleId: string): boolean {
  return articleId === 'pkg-sac';
}

export function paperBagPriceSummaryNote(r: PaperBagPriceResult): string {
  if (!r.calculable) {
    return r.reason ? `Sac papier — ${r.reason}` : 'Sac papier — prix en attente';
  }
  return (
    `Équiv. ${r.formatEquivalent} (${r.equivA4}×A4)`
    + ` · ISF ${r.prixA4Impression} Ar`
    + ` · dépenses ${r.sousTotalDepenses} Ar`
    + ` · ×1,${Math.round(100 + r.beneficePct + r.margeDepensePct - 100)}`
  );
}

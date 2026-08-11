/**
 * Règles type d’impression / techno / photocopie — Admin/Excel, pas de tarifs hardcodés.
 */

export type PrintColorMode = 'nb' | 'quadri' | 'any';
export type PrintTechnology = 'jet' | 'laser' | 'offset' | 'photocopie' | 'other';

export type ParsedImpressionType = {
  colorMode: PrintColorMode;
  technology: PrintTechnology;
  isPhotocopie: boolean;
  /** Type normalisé pour lookup prix (Photocopie → même bucket qu’Impression). */
  pricingTypeLabel: string;
};

export type PrintTechnologyRuleLike = {
  ruleCode: string;
  supportScope: string;
  printType: string;
  technology: string;
  baseTechnology: string | null;
  supplementAr: number;
  active?: boolean;
  details?: string | null;
};

export type ServicePriceEquivalenceLike = {
  serviceKey: string;
  serviceLabel: string;
  equivalentKey: string;
  equivalentLabel: string;
  priceRule: string;
  supplementAr: number;
  active?: boolean;
  details?: string | null;
};

/** Laser Quadri Offset = Jet + 100 Ar (modifiable Admin). */
export const DEFAULT_PRINT_TECHNOLOGY_RULES: PrintTechnologyRuleLike[] = [
  {
    ruleCode: 'LASER_QUADRI_OFFSET',
    supportScope: 'offset_standard',
    printType: 'quadri',
    technology: 'laser',
    baseTechnology: 'jet',
    supplementAr: 100,
    details: 'Prix Laser Quadri = Prix Jet d’encre Couleur + supplément',
  },
];

export const DEFAULT_SERVICE_EQUIVALENCES: ServicePriceEquivalenceLike[] = [
  {
    serviceKey: 'photocopie',
    serviceLabel: 'Photocopie',
    equivalentKey: 'impression_sf',
    equivalentLabel: 'Impression sans finition',
    priceRule: 'same_price',
    supplementAr: 0,
    details: 'Prix impression = Prix photocopie',
  },
];

/** Groupe UX satiné / toile / invitation / papier personnalisé (équivalences POS).
 * Tarifs PRIX 2026 : toile_fin → grille `toile`, invitation → grille `invitation`. */
export const PERSONALIZED_PAPER_GROUP = 'papier_personnalise';
export const PERSONALIZED_PAPER_MEMBER_IDS = [
  'toile_fin',
  'invitation',
  'satine_mat',
  'autres',
] as const;

export function isOffsetStandardMaterial(matiereLabel: string, matId?: string): boolean {
  const id = (matId ?? '').toLowerCase();
  if (id === 'standard' || id === 'journal') return true;
  const s = matiereLabel.toLowerCase();
  return (
    s.includes('offset')
    || s.includes('standard')
    || s.includes('journal')
    || s.includes('autocopiant')
  );
}

export function parseImpressionType(raw: string): ParsedImpressionType {
  const v = String(raw ?? '').trim().toLowerCase();
  const isPhotocopie = v.includes('photocopie') || v.includes('photocopy');
  const isNb =
    v.includes('n&b')
    || v.includes('n/b')
    || /\bn\s*b\b/.test(v)
    || v.includes('noir')
    || v.includes('niveaux de gris');

  let technology: PrintTechnology = 'other';
  if (isPhotocopie) technology = 'photocopie';
  else if (v.includes('laser')) technology = 'laser';
  else if (v.includes('jet') || v.includes('encre') || v.includes('numérique') || v.includes('numerique')) {
    technology = 'jet';
  } else if (v.includes('offset')) technology = 'offset';

  const colorMode: PrintColorMode = isNb ? 'nb' : 'quadri';

  // Photocopie → même bucket prix qu’Impression (NB ou couleur)
  let pricingTypeLabel = raw;
  if (isPhotocopie) {
    pricingTypeLabel = isNb
      ? 'Impression numérique N&B'
      : 'Impression numérique couleur';
  }

  return { colorMode, technology, isPhotocopie, pricingTypeLabel };
}

export function findLaserSupplementAr(
  rules: PrintTechnologyRuleLike[],
  opts: { offsetOnly: boolean; colorMode: PrintColorMode },
): number {
  const active = rules.filter((r) => r.active !== false);
  const match = active.find((r) => {
    if (r.technology !== 'laser') return false;
    if (!(r.printType === 'any' || r.printType === opts.colorMode || r.printType === 'quadri')) return false;
    const scope = String(r.supportScope ?? '').toLowerCase();
    if (scope === 'all') return true;
    if (opts.offsetOnly && (scope === 'offset_standard' || scope.includes('offset'))) return true;
    return false;
  });
  return match?.supplementAr ?? 0;
}

export function applyTechnologySupplement(
  basePrice: number,
  supplementAr: number,
): number {
  return Math.round(basePrice + Math.max(0, supplementAr));
}

export function isPersonalizedPaperGroupMember(matId: string, matiereLabel: string): boolean {
  if ((PERSONALIZED_PAPER_MEMBER_IDS as readonly string[]).includes(matId)) return true;
  const s = matiereLabel.toLowerCase();
  return (
    s.includes('satin')
    || s.includes('toile')
    || s.includes('invitation')
    || s.includes('personnalis')
  );
}

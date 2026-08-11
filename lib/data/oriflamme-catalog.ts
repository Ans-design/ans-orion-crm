/**
 * Oriflamme (beach flag) — hauteur totale montée + voile imprimée (largeur × hauteur).
 *
 * Sources croisées :
 * - Printoclock (gabarits plume / goutte / rectangle)
 * - Windflag, Rapid Flyer, KDGarden (goutte)
 * - Bikom, Flag Minute, Faber France, Backdrop/Alibaba Flagbank (plume)
 * - Macap Flag, Strongdisplay, Sunrise Flag (couteaux / lame)
 * - France Banderole (rectangle)
 *
 * Convention affichage : voile = largeur × hauteur (cm), zone d'impression hors fourreau.
 * La hauteur voile est toujours < hauteur totale montée (marge mât / embase).
 */

export const ORIFLAMME_TYPES = [
  'Oriflamme goutte',
  'Oriflamme plume',
  'Oriflamme couteaux',
  'Oriflamme rectangle',
] as const;

export type OriflammeType = (typeof ORIFLAMME_TYPES)[number];

export interface OriflammeHeightSpec {
  /** Hauteur totale montée (structure complète) */
  support: string;
  /** Largeur × hauteur — zone d'impression voile */
  voile: string;
  /** Référence fournisseur */
  source: string;
}

/** Goutte — Windflag, Rapid Flyer, KDGarden, Feather-flags UK */
const _GOUTTE: OriflammeHeightSpec[] = [
  { support: '2,10 m', voile: '70 × 149 cm', source: 'Rapid Flyer' },
  { support: '2,40 m', voile: '80 × 194 cm', source: 'KDGarden teardrop' },
  { support: '2,45 m', voile: '75 × 194 cm', source: 'Windflag S' },
  { support: '2,50 m', voile: '90 × 180 cm', source: 'Feather-flags UK' },
  { support: '2,80 m', voile: '70 × 216 cm', source: 'Rapid Flyer' },
  { support: '3,00 m', voile: '92 × 228 cm', source: 'Windflag M' },
  { support: '3,50 m', voile: '103 × 298 cm', source: 'Windflag L' },
  { support: '4,00 m', voile: '100 × 300 cm', source: 'Feather-flags UK' },
  { support: '4,40 m', voile: '132 × 352 cm', source: 'Windflag XL' },
  { support: '4,60 m', voile: '122 × 366 cm', source: 'Rapid Flyer' },
  { support: '4,80 m', voile: '121 × 367 cm', source: 'KDGarden teardrop L' },
  { support: '5,40 m', voile: '145 × 446 cm', source: 'Windflag XXL' },
];

/** Plume — Printoclock, Bikom, Faber Beach Line, Alibaba/Flagbank */
const _PLUME: OriflammeHeightSpec[] = [
  { support: '2,03 m', voile: '75 × 178 cm', source: 'Printoclock' },
  { support: '2,30 m', voile: '50 × 170 cm', source: 'Faber Mini Beach' },
  { support: '2,40 m', voile: '61 × 196 cm', source: 'Printoclock' },
  { support: '2,80 m', voile: '55 × 200 cm', source: 'Backdrop / Alibaba Flagbank' },
  { support: '2,90 m', voile: '55 × 226 cm', source: 'Bikom S / Flag Minute' },
  { support: '3,08 m', voile: '83 × 252 cm', source: 'Printoclock' },
  { support: '3,40 m', voile: '65 × 272 cm', source: 'Bikom M' },
  { support: '3,51 m', voile: '97 × 313 cm', source: 'Printoclock' },
  { support: '4,00 m', voile: '70 × 330 cm', source: 'Faber Standard Beach' },
  { support: '4,65 m', voile: '95 × 407 cm', source: 'Printoclock' },
  { support: '5,00 m', voile: '76 × 417 cm', source: 'Bikom XL' },
  { support: '5,60 m', voile: '75 × 410 cm', source: 'Alibaba Flagbank XL' },
  { support: '6,00 m', voile: '90 × 516 cm', source: 'Bikom XXL' },
];

/** Couteaux (lame / blade / potence) — Macap, Strongdisplay, Sunrise Flag */
const _COUTEAUX: OriflammeHeightSpec[] = [
  { support: '2,30 m', voile: '50 × 160 cm', source: 'Macap classique' },
  { support: '2,40 m', voile: '60 × 165 cm', source: 'Macap potence' },
  { support: '2,50 m', voile: '63 × 200 cm', source: 'Sunrise blade' },
  { support: '2,80 m', voile: '50 × 220 cm', source: 'Macap classique' },
  { support: '3,00 m', voile: '60 × 240 cm', source: 'Strongdisplay blade' },
  { support: '3,50 m', voile: '85 × 300 cm', source: 'Macap potence / Sunrise' },
  { support: '4,00 m', voile: '50 × 330 cm', source: 'Macap classique' },
  { support: '4,60 m', voile: '85 × 380 cm', source: 'Macap potence' },
  { support: '4,70 m', voile: '80 × 410 cm', source: 'Sunrise blade L' },
];

/** Rectangle — Printoclock, Strongdisplay, France Banderole */
const _RECTANGLE: OriflammeHeightSpec[] = [
  { support: '2,30 m', voile: '72 × 182 cm', source: 'Printoclock (mât télescopique)' },
  { support: '3,40 m', voile: '70 × 250 cm', source: 'Strongdisplay rectangle' },
  { support: '4,00 m', voile: '80 × 300 cm', source: 'France Banderole' },
  { support: '4,50 m', voile: '80 × 350 cm', source: 'France Banderole / Strongdisplay' },
];

export const ORIFLAMME_HEIGHTS_BY_TYPE: Record<OriflammeType, OriflammeHeightSpec[]> = {
  'Oriflamme goutte': _GOUTTE,
  'Oriflamme plume': _PLUME,
  'Oriflamme couteaux': _COUTEAUX,
  'Oriflamme rectangle': _RECTANGLE,
};

export const ORIFLAMME_MATIERES = [
  'Tissu drapeau polyester 110 g/m² M1',
  'Tissu tricoté ajouré 130 g/m²',
  'Tissu polyester renforcé 115 g/m²',
  'Matière personnalisée',
] as const;

export const ORIFLAMME_BASES = [
  'Base locale avec ciment',
  'Platine ronde',
  'Platine carrée',
  'Pied croisé',
  'Pied à planter',
  'Base à eau / sable',
  'Base personnalisée',
] as const;

function parseVoileParts(voile: string): { largeur: number; hauteur: number } {
  const parts = voile.split('×').map((p) => parseFloat(p.trim().replace(',', '.').replace(/[^\d.]/g, '')));
  if (parts.length < 2 || parts.some(Number.isNaN)) return { largeur: 0, hauteur: 0 };
  const [a, b] = parts;
  return { largeur: Math.min(a, b), hauteur: Math.max(a, b) };
}

/** Hauteur totale montée en cm */
export function parseOriflammeSupportCm(support: string): number {
  const n = parseFloat(support.replace(',', '.').replace(/[^\d.]/g, ''));
  return Math.round(n * 100);
}

/** Largeur voile imprimée (cm) — 1re dimension L × H */
export function parseOriflammeVoileWidthCm(voile: string): number {
  return parseVoileParts(voile).largeur;
}

/** Hauteur voile imprimée (cm) — 2e dimension L × H */
export function parseOriflammeVoileHeightCm(voile: string): number {
  return parseVoileParts(voile).hauteur;
}

/** Marge structure (cm) entre hauteur totale et hauteur voile */
export function oriflammeVoileMarginCm(support: string, voile: string): number {
  return parseOriflammeSupportCm(support) - parseOriflammeVoileHeightCm(voile);
}

export function oriflammeHauteursOptionsByType(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const type of ORIFLAMME_TYPES) {
    out[type] = ORIFLAMME_HEIGHTS_BY_TYPE[type].map((h) => h.support);
  }
  return out;
}

export function getOriflammeSpec(type: string, supportHeight: string): OriflammeHeightSpec | null {
  const specs = ORIFLAMME_HEIGHTS_BY_TYPE[type as OriflammeType];
  return specs?.find((s) => s.support === supportHeight) ?? null;
}

export function getOriflammeVoileLabel(type: string, supportHeight: string): string | null {
  const match = getOriflammeSpec(type, supportHeight);
  if (!match) return null;
  const w = parseOriflammeVoileWidthCm(match.voile);
  const h = parseOriflammeVoileHeightCm(match.voile);
  return `Voile ${w} × ${h} cm (L × H)`;
}

export function getOriflammeVoileDetail(type: string, supportHeight: string): string | null {
  const match = getOriflammeSpec(type, supportHeight);
  if (!match) return null;
  const w = parseOriflammeVoileWidthCm(match.voile);
  const h = parseOriflammeVoileHeightCm(match.voile);
  const margin = oriflammeVoileMarginCm(match.support, match.voile);
  return `Largeur ${w} cm × hauteur ${h} cm — marge structure ~${margin} cm — ref. ${match.source}`;
}

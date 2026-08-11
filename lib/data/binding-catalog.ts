/**
 * Catalogue reliures — SPIRALES, PIQURES, DCC (catalogue.ts) + règles métier POS.
 */

import { DCC, PIQURES, SPIRALES } from '@/lib/data/catalogue';

/** Libellés canoniques (faconnage, livres, bloc-notes, calendrier). */
export const BINDING_LABELS = {
  SPIRALE_PLASTIQUE: 'Spirale plastique',
  SPIRALE_METAL: 'Spirale métallique',
  PIQURE: 'Piqûre à cheval',
  DCC: 'Dos carré collé',
  DCC_COUSU: 'Dos carré cousu',
  RELIURE_COUSUE: 'Reliure cousue',
  BLOC_COLLE: 'Bloc collé',
  RELIURE_PERSONNALISEE: 'Reliure personnalisée',
} as const;

export type BindingLabel = (typeof BINDING_LABELS)[keyof typeof BINDING_LABELS];

export type GrammageBand = '80' | '120' | '250';

const GRAMMAGE_BAND_KEYS: Record<GrammageBand, keyof (typeof SPIRALES)[0]> = {
  '80': 'f80',
  '120': 'f120',
  '250': 'f250',
};

/** Reliures proposées selon type de livre (bk-livres) — libellés canoniques. */
export const LIVRES_RELIURE_BY_TYPE: Record<string, string[]> = {
  Booklet: [
    BINDING_LABELS.SPIRALE_PLASTIQUE,
    BINDING_LABELS.SPIRALE_METAL,
    BINDING_LABELS.PIQURE,
    BINDING_LABELS.DCC,
    BINDING_LABELS.RELIURE_PERSONNALISEE,
  ],
  Livret: [
    BINDING_LABELS.PIQURE,
    BINDING_LABELS.SPIRALE_PLASTIQUE,
    BINDING_LABELS.RELIURE_PERSONNALISEE,
  ],
  Fascicule: [
    BINDING_LABELS.PIQURE,
    BINDING_LABELS.SPIRALE_PLASTIQUE,
    BINDING_LABELS.RELIURE_PERSONNALISEE,
  ],
  Magazine: [
    BINDING_LABELS.PIQURE,
    BINDING_LABELS.DCC,
    BINDING_LABELS.DCC_COUSU,
    BINDING_LABELS.RELIURE_PERSONNALISEE,
  ],
  'Menu simple': ['Sans reliure', 'Pelliculé', BINDING_LABELS.RELIURE_PERSONNALISEE],
  'Menu livret': [
    BINDING_LABELS.PIQURE,
    BINDING_LABELS.SPIRALE_PLASTIQUE,
    'Pelliculé',
    BINDING_LABELS.RELIURE_PERSONNALISEE,
  ],
  'Menu plastifié': ['Pelliculé', BINDING_LABELS.SPIRALE_PLASTIQUE, BINDING_LABELS.RELIURE_PERSONNALISEE],
  'Livre broché': [BINDING_LABELS.DCC, BINDING_LABELS.PIQURE, BINDING_LABELS.RELIURE_PERSONNALISEE],
  'Livre relié': [BINDING_LABELS.RELIURE_COUSUE, BINDING_LABELS.DCC, BINDING_LABELS.RELIURE_PERSONNALISEE],
  'Livre de poche': [BINDING_LABELS.DCC, BINDING_LABELS.PIQURE, BINDING_LABELS.RELIURE_PERSONNALISEE],
  'Livre cartonné': [BINDING_LABELS.DCC, BINDING_LABELS.RELIURE_COUSUE, BINDING_LABELS.RELIURE_PERSONNALISEE],
  'Mémoire / thèse': [
    BINDING_LABELS.DCC,
    BINDING_LABELS.RELIURE_COUSUE,
    BINDING_LABELS.SPIRALE_PLASTIQUE,
    BINDING_LABELS.RELIURE_PERSONNALISEE,
  ],
  'Publication personnalisée': [BINDING_LABELS.RELIURE_PERSONNALISEE],
};

/** Reliures faconnage (fin-reliure, bloc-notes). */
export const FACONNAGE_RELIURE_OPTIONS = [
  BINDING_LABELS.SPIRALE_PLASTIQUE,
  BINDING_LABELS.SPIRALE_METAL,
  BINDING_LABELS.PIQURE,
  BINDING_LABELS.DCC,
  BINDING_LABELS.DCC_COUSU,
  BINDING_LABELS.RELIURE_PERSONNALISEE,
] as const;

export const BLOC_NOTE_RELIURE_OPTIONS = [
  BINDING_LABELS.BLOC_COLLE,
  BINDING_LABELS.SPIRALE_PLASTIQUE,
  BINDING_LABELS.SPIRALE_METAL,
  BINDING_LABELS.PIQURE,
  BINDING_LABELS.DCC,
  'Autres',
] as const;

function parseMaxFromLimit(raw: string): number | null {
  const m = raw.match(/≤\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function parsePageRange(raw: string): { min: number; max: number } | null {
  const m = raw.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (!m) return null;
  return { min: Number(m[1]), max: Number(m[2]) };
}

/** Extrait un entier depuis une valeur pages (ex. « 32 », « 32 pages »). */
export function parsePageCount(pagesRaw: unknown): number | null {
  if (pagesRaw == null || pagesRaw === '') return null;
  const s = String(pagesRaw).trim();
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Convertit pages document → feuilles physiques selon mode impression. */
export function computePhysicalSheets(
  pageCount: number,
  printMode: 'recto' | 'recto_verso',
): number {
  if (!pageCount || pageCount <= 0) return 0;
  if (printMode === 'recto') return pageCount;
  return Math.ceil(pageCount / 2);
}

export function isRectoVersoPrintMode(faceRaw: unknown): boolean {
  const s = String(faceRaw ?? '').toLowerCase();
  return s.includes('recto-verso') || s.includes('recto verso') || s.includes('r/v');
}

export function printModeFromConfig(config: Record<string, unknown>): 'recto' | 'recto_verso' {
  const face = config.face_interieur ?? config.face ?? config.printMode;
  return isRectoVersoPrintMode(face) ? 'recto_verso' : 'recto';
}

/** Feuilles physiques depuis config POS (pages + mode impression). */
export function getPhysicalSheetsFromConfig(config: Record<string, unknown>): number | null {
  const pages = parsePagesFromConfig(config);
  if (pages == null || pages <= 0) return null;
  return computePhysicalSheets(pages, printModeFromConfig(config));
}

/** Extrait le nombre de pages depuis la config POS (pages, volets menu, fin-reliure, bloc-notes). */
export function parsePagesFromConfig(config: Record<string, unknown>): number | null {
  const direct = parsePageCount(config.pages) ?? parsePageCount(config.nb_pages);
  if (direct) return direct;

  const nfLabel = String(config.nombre_feuilles ?? '');
  if (/autres/i.test(nfLabel)) {
    const customRaw = config.nombre_feuilles_custom;
    const customN = typeof customRaw === 'number' ? customRaw : parseInt(String(customRaw ?? ''), 10);
    if (Number.isFinite(customN) && customN > 0) {
      const face = String(config.face_interieur ?? config.face ?? '').toLowerCase();
      return face.includes('verso') ? customN * 2 : customN;
    }
    return null;
  }

  const feuilles = parsePageCount(config.nombre_feuilles);
  if (feuilles) {
    const face = String(config.face_interieur ?? config.face ?? '').toLowerCase();
    return face.includes('verso') ? feuilles * 2 : feuilles;
  }
  const v = config.volets;
  if (v == null || v === '') return null;
  const s = String(v);
  const pagesRange = s.match(/(\d+)\s*[–-]\s*(\d+)\s*pages/i);
  if (pagesRange) return Number(pagesRange[2]);
  const volets = s.match(/(\d+)\s*volet/i);
  if (volets) return Number(volets[1]) * 2;
  if (/livret/i.test(s)) return 8;
  return parsePageCount(v);
}

/** Bande grammage pour tables SPIRALES / PIQURES / DCC. */
export function grammageToBand(grammageRaw: unknown): GrammageBand {
  const s = String(grammageRaw ?? '').replace(/\s/g, '').toLowerCase();
  const g = parseInt(s.replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(g) || g <= 100) return '80';
  if (g <= 200) return '120';
  return '250';
}

function pickSpiral(
  pages: number,
  band: GrammageBand,
  metal: boolean,
): (typeof SPIRALES)[0] | null {
  const key = GRAMMAGE_BAND_KEYS[band];
  for (const row of SPIRALES) {
    if (metal && !row.metal) continue;
    const max = parseMaxFromLimit(String(row[key]));
    if (max != null && pages <= max) return row;
  }
  return null;
}

function pickStaple(pages: number, band: GrammageBand): (typeof PIQURES)[0] | null {
  const key = band === '250' ? 'f120' : (`f${band}` as 'f80' | 'f120');
  for (const row of PIQURES) {
    const max = parseMaxFromLimit(String(row[key]));
    if (max != null && pages <= max) return row;
  }
  return null;
}

function pickDcc(pages: number, band: GrammageBand): (typeof DCC)[0] | null {
  const key = `p${band}` as 'p80' | 'p120' | 'p250';
  for (const row of DCC) {
    const range = parsePageRange(String(row[key]));
    if (range && pages >= range.min && pages <= range.max) return row;
  }
  return null;
}

export interface BindingDetail {
  compatible: boolean;
  summary: string;
  reference?: string;
  dimensionMm?: string;
  dimensionInch?: string;
  maxPages?: number;
  spineMm?: string;
  priceAr?: number;
  warnings: string[];
}

function spiralDetail(
  pages: number,
  band: GrammageBand,
  metal: boolean,
): BindingDetail {
  const row = pickSpiral(pages, band, metal);
  const label = metal ? BINDING_LABELS.SPIRALE_METAL : BINDING_LABELS.SPIRALE_PLASTIQUE;
  if (!row) {
    return {
      compatible: false,
      summary: `${label} — capacité dépassée pour ${pages} p. (${band} g)`,
      warnings: ['Réduire le nombre de pages ou changer de reliure / grammage.'],
    };
  }
  const max = parseMaxFromLimit(String(row[GRAMMAGE_BAND_KEYS[band]]));
  return {
    compatible: true,
    summary: `${label} · Ø ${row.mm} mm (${row.ref}) · max ${row[GRAMMAGE_BAND_KEYS[band]]} p. @ ${band} g`,
    reference: row.ref,
    dimensionMm: `${row.mm} mm`,
    dimensionInch: row.ref,
    maxPages: max ?? undefined,
    priceAr: row.px,
    warnings: pages % 2 !== 0 ? ['Nombre de pages pair recommandé.'] : [],
  };
}

function stapleDetail(
  pageCount: number,
  physicalSheets: number,
  band: GrammageBand,
): BindingDetail {
  if (pageCount % 4 !== 0) {
    const upper = Math.ceil(pageCount / 4) * 4;
    const lower = Math.floor(pageCount / 4) * 4 || 4;
    return {
      compatible: false,
      summary: 'Piqûre à cheval — multiple de 4 pages obligatoire',
      warnings: [`${pageCount} pages : choisir ${lower} ou ${upper} pages.`],
    };
  }
  const row = pickStaple(physicalSheets, band);
  if (!row) {
    return {
      compatible: false,
      summary: `Piqûre à cheval — capacité dépassée pour ${physicalSheets} feuilles (${band} g)`,
      warnings: ['Choisir dos carré collé ou spirale pour ce volume.'],
    };
  }
  const max = parseMaxFromLimit(String(row[band === '250' ? 'f120' : (`f${band}` as 'f80' | 'f120')]));
  return {
    compatible: true,
    summary: `Piqûre · agrafe ${row.ref} · pattes ${row.mm} · max ${band === '80' ? row.f80 : row.f120} feuilles`,
    reference: row.ref,
    dimensionMm: row.mm,
    maxPages: max ?? undefined,
    priceAr: row.px,
    warnings: [],
  };
}

function dccDetail(physicalSheets: number, band: GrammageBand): BindingDetail {
  const row = pickDcc(physicalSheets, band);
  if (!row) {
    return {
      compatible: false,
      summary: `Dos carré collé — plage non couverte pour ${physicalSheets} feuilles (${band} g)`,
      warnings: ['Vérifier épaisseur tranche ou ajuster le nombre de pages.'],
    };
  }
  return {
    compatible: true,
    summary: `Dos carré collé · tranche ${row.ep} · ${physicalSheets} feuilles @ ${band} g`,
    spineMm: row.ep,
    priceAr: row.px,
    warnings: [],
  };
}

const STATIC_DETAILS: Partial<Record<string, Omit<BindingDetail, 'compatible'> & { compatible?: boolean }>> = {
  [BINDING_LABELS.DCC_COUSU]: {
    compatible: true,
    summary: 'Dos carré cousu — couture + collage (magazines, catalogues épais)',
    warnings: ['Minimum ~48 pages selon grammage.'],
  },
  [BINDING_LABELS.RELIURE_COUSUE]: {
    compatible: true,
    summary: 'Reliure cousue — livre relié (tranche visible)',
    warnings: [],
  },
  [BINDING_LABELS.BLOC_COLLE]: {
    compatible: true,
    summary: 'Bloc collé — colle en tête (bloc-notes)',
    warnings: [],
  },
  [BINDING_LABELS.RELIURE_PERSONNALISEE]: {
    compatible: true,
    summary: 'Reliure sur mesure — détailler en remarques',
    warnings: [],
  },
};

/** Détail technique d'une reliure selon pages + grammage. */
export function getBindingDetail(
  reliureLabel: string,
  pages: number | null,
  grammageBand: GrammageBand,
): BindingDetail {
  const staticInfo = STATIC_DETAILS[reliureLabel];
  if (staticInfo && pages == null) {
    return {
      compatible: staticInfo.compatible ?? true,
      summary: staticInfo.summary ?? reliureLabel,
      warnings: staticInfo.warnings ?? [],
      reference: staticInfo.reference,
      dimensionMm: staticInfo.dimensionMm,
      dimensionInch: staticInfo.dimensionInch,
      maxPages: staticInfo.maxPages,
      spineMm: staticInfo.spineMm,
      priceAr: staticInfo.priceAr,
    };
  }
  if (pages == null || pages <= 0) {
    return {
      compatible: true,
      summary: reliureLabel,
      warnings: ['Indiquer le nombre de pages pour afficher réf. agrafe / spirale / tranche.'],
    };
  }

  switch (reliureLabel) {
    case BINDING_LABELS.SPIRALE_PLASTIQUE:
      return spiralDetail(pages, grammageBand, false);
    case BINDING_LABELS.SPIRALE_METAL:
      return spiralDetail(pages, grammageBand, true);
    case BINDING_LABELS.PIQURE:
      return stapleDetail(pages, pages, grammageBand);
    case BINDING_LABELS.DCC:
      return dccDetail(pages, grammageBand);
    default:
      if (staticInfo) {
        return {
          compatible: staticInfo.compatible ?? true,
          summary: staticInfo.summary ?? reliureLabel,
          warnings: staticInfo.warnings ?? [],
          reference: staticInfo.reference,
          dimensionMm: staticInfo.dimensionMm,
          dimensionInch: staticInfo.dimensionInch,
          maxPages: staticInfo.maxPages,
          spineMm: staticInfo.spineMm,
          priceAr: staticInfo.priceAr,
        };
      }
      return { compatible: true, summary: reliureLabel, warnings: [] };
  }
}

/** Lit pages + grammage depuis la config POS et retourne le détail reliure. */
export function getBindingDetailFromConfig(
  reliureLabel: string,
  config: Record<string, unknown>,
): BindingDetail | null {
  if (!reliureLabel) return null;
  const pages = parsePagesFromConfig(config);
  const physicalSheets = getPhysicalSheetsFromConfig(config);
  const grammage =
    config.grammage_int ??
    config.grammage_interieur ??
    config.grammage ??
    config.grammage_couv;
  const band = grammageToBand(grammage);

  // Piqûre : validation %4 sur pages document, capacité agrafe sur feuilles physiques
  if (reliureLabel === BINDING_LABELS.PIQURE) {
    const sheets = physicalSheets ?? pages;
    if (pages == null || sheets == null) {
      return getBindingDetail(reliureLabel, pages, band);
    }
    return stapleDetail(pages, sheets, band);
  }
  // DCC : table basée sur feuilles physiques
  if (reliureLabel === BINDING_LABELS.DCC) {
    const sheets = physicalSheets ?? pages;
    if (sheets == null) return getBindingDetail(reliureLabel, pages, band);
    return dccDetail(sheets, band);
  }
  // Spirales : capacité en feuilles physiques
  if (
    reliureLabel === BINDING_LABELS.SPIRALE_PLASTIQUE ||
    reliureLabel === BINDING_LABELS.SPIRALE_METAL
  ) {
    const sheets = physicalSheets ?? pages;
    const detail = getBindingDetail(reliureLabel, sheets, band);
    if (pages != null && physicalSheets != null && pages !== physicalSheets) {
      return {
        ...detail,
        summary: detail.summary.replace(
          `${sheets} p.`,
          `${physicalSheets} feuilles (${pages} p. ${printModeFromConfig(config) === 'recto_verso' ? 'R/V' : 'R'})`,
        ),
        warnings: [
          ...detail.warnings,
          `Feuilles physiques : ${physicalSheets} (${pages} pages document).`,
        ],
      };
    }
    return detail;
  }

  return getBindingDetail(reliureLabel, pages, band);
}

export function isBindingCompatibleWithConfig(
  reliureLabel: string,
  config: Record<string, unknown>,
): boolean {
  const d = getBindingDetailFromConfig(reliureLabel, config);
  return d?.compatible !== false;
}

/** Sous-titre pour puce reliure (liste options). */
export function getBindingOptionHint(reliureLabel: string): string {
  switch (reliureLabel) {
    case BINDING_LABELS.SPIRALE_PLASTIQUE:
      return 'Ø 6–26 mm · plastique';
    case BINDING_LABELS.SPIRALE_METAL:
      return 'Ø 6–16 mm · métal';
    case BINDING_LABELS.PIQURE:
      return 'Agrafes 23/006–23/015 · multiple de 4 p.';
    case BINDING_LABELS.DCC:
      return 'Tranche 4–27 mm · collage';
    case BINDING_LABELS.DCC_COUSU:
      return 'Couture + collage';
    case BINDING_LABELS.RELIURE_COUSUE:
      return 'Livre relié';
    case BINDING_LABELS.BLOC_COLLE:
      return 'Bloc-notes';
    default:
      return '';
  }
}

export { SPIRALES, PIQURES, DCC };

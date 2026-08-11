/**
 * Paramètres Carnet autocopiant / Facturier — Admin/Excel, seed idempotent.
 */

export type CarnetAutocopiantParamLike = {
  code: string;
  label: string;
  prixA4Nb: number;
  prixA4Quadri: number;
  numerotationArPerPage: number;
  reliureAr: number;
  perforationArPerA4: number;
  couverture300gA3RectoAr: number;
  wastePct: number;
  active?: boolean;
  visiblePOS?: boolean;
  details?: string | null;
};

export const DEFAULT_CARNET_AUTOCOPIANT_PARAMS: CarnetAutocopiantParamLike = {
  code: 'default',
  label: 'Carnet autocopiant / Facturier',
  prixA4Nb: 400,
  prixA4Quadri: 600,
  numerotationArPerPage: 50,
  reliureAr: 2000,
  perforationArPerA4: 50,
  /** 0 = dériver depuis grille ISF PCB 300G A3 si dispo */
  couverture300gA3RectoAr: 0,
  wastePct: 5,
  active: true,
  visiblePOS: true,
  details: 'Formule : papier×facteur×feuillets + numérotation + couverture + reliure + perforation + perte %',
};

/** Facteurs type autocopiant (Duplicopie…Quintuplicopie). */
export const CARNET_TYPE_FACTORS: Record<string, number> = {
  duplicopie: 2,
  triplicopie: 3,
  quadruplicopie: 4,
  quintuplicopie: 5,
};

export function parseCarnetTypeFactor(raw: string, nbCopiesCustom?: number): number {
  const v = String(raw ?? '').toLowerCase();
  if (v.includes('quintup')) return 5;
  if (v.includes('quadrup')) return 4;
  if (v.includes('trip')) return 3;
  if (v.includes('dup')) return 2;
  if (v.includes('autre') || v.includes('personnal')) {
    const n = Number(nbCopiesCustom);
    if (Number.isFinite(n) && n >= 2) return Math.min(10, Math.floor(n));
  }
  const m = v.match(/(\d+)\s*cop/);
  if (m) return Math.max(2, Math.min(10, parseInt(m[1], 10)));
  return 2;
}

export function parseCarnetFeuillets(config: Record<string, unknown>): number {
  const raw = String(config.feuillets ?? config.nombre_feuillets ?? '50');
  if (/personnal/i.test(raw)) {
    const custom = Number(config.feuillets_custom ?? config.nombre_feuillets_custom);
    if (Number.isFinite(custom) && custom > 0) return Math.floor(custom);
  }
  const m = raw.match(/(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 50;
}

export function parseCarnetFormatCode(raw: string): string {
  const v = String(raw ?? '').toUpperCase();
  if (v.includes('A3+') || v.includes('SRA3')) return 'A3+';
  if (/\bA3\b/.test(v)) return 'A3';
  if (/\bA4\b/.test(v)) return 'A4';
  if (/\bA5\b/.test(v)) return 'A5';
  if (/\bA6\b/.test(v)) return 'A6';
  if (/\bA7\b/.test(v)) return 'A7';
  if (v.includes('DL') || v.includes('1/3')) return 'DL';
  return 'A4';
}

/** Équivalent A4 pour perforation (A5 = 0.5, A6 = 0.25…). */
export function formatA4Equivalent(formatCode: string): number {
  const f = formatCode.toUpperCase();
  if (f === 'A3' || f === 'A3+') return 2;
  if (f === 'A4') return 1;
  if (f === 'A5') return 0.5;
  if (f === 'DL') return 1 / 3;
  if (f === 'A6') return 0.25;
  if (f === 'A7') return 0.125;
  return 1;
}

export function isCarnetNumerotationOn(raw: string): boolean {
  const v = String(raw ?? '').toLowerCase();
  if (!v || v.includes('sans')) return false;
  return v.includes('numérot') || v.includes('numerot') || v.includes('séquent') || v.includes('avec');
}

export function isCarnetInteriorQuadri(raw: string): boolean {
  const v = String(raw ?? '').toLowerCase();
  if (v.includes('gris') || v.includes('n&b') || v.includes('noir') || v.includes('ndg')) return false;
  return v.includes('quadri') || v.includes('couleur') || v.includes('cmjn');
}

/**
 * Excel Packaging multi-feuilles — types, marges, règles.
 */
export const PACKAGING_TEMPLATE_EXCEL_COLUMNS = [
  'ID',
  'TYPE BOÎTE',
  'FORMULE SURFACE',
  'FORMULE KEY',
  'COEFFICIENT RABATS',
  'COEFFICIENT LANGUETTES',
  'COEFFICIENT COLLAGE',
  'MARGE DÉCHETS %',
  'SURFACE MANUELLE',
  'ACTIF',
  'VISIBLE POS',
  'COMMENTAIRE',
] as const;

export const PACKAGING_MARGIN_EXCEL_COLUMNS = [
  'ID',
  'SCOPE',
  'ARTICLE',
  'TYPE BOÎTE',
  'MARGE DÉCHETS %',
  'BÉNÉFICE %',
  'MARGE DÉPENSE %',
  'ARRONDI',
  'ACTIF',
  'VISIBLE POS',
  'COMMENTAIRE',
] as const;

export const PACKAGING_RULE_EXCEL_COLUMNS = [
  'ID',
  'ARTICLE',
  'TYPE CALCUL',
  'FORMULE',
  'SOURCE IMPRESSION',
  'SOURCE FINITIONS',
  'UTILISE SURFACE',
  'UTILISE BENEFICE',
  'UTILISE MARGE DEPENSE',
  'ACTIF',
  'VISIBLE POS',
  'COMMENTAIRE',
] as const;

function pick(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = raw[k] ?? raw[k.toUpperCase()] ?? raw[k.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function num(raw: string, fallback: number): number {
  const n = Number(String(raw).replace(',', '.').replace('%', ''));
  return Number.isFinite(n) ? n : fallback;
}

function bool(raw: string, fallback = true): boolean {
  if (!raw) return fallback;
  return /^(oui|yes|true|1|actif|published)/i.test(raw);
}

export function parsePackagingTemplateExcelRow(raw: Record<string, unknown>, line: number) {
  const typeBoite = pick(raw, 'TYPE BOÎTE', 'TYPE BOITE', 'typeBoite');
  if (!typeBoite) return { error: `Ligne ${line} : TYPE BOÎTE requis` as const };
  return {
    row: {
      excelId: pick(raw, 'ID', 'id') || null,
      typeBoite,
      formuleSurface: pick(raw, 'FORMULE SURFACE', 'formuleSurface') || null,
      formuleKey: pick(raw, 'FORMULE KEY', 'formuleKey') || 'straight_tuck',
      coeffRabats: num(pick(raw, 'COEFFICIENT RABATS'), 1),
      coeffLanguettes: num(pick(raw, 'COEFFICIENT LANGUETTES'), 1),
      coeffCollage: num(pick(raw, 'COEFFICIENT COLLAGE'), 1),
      margeDechetsPct: num(pick(raw, 'MARGE DÉCHETS %', 'MARGE DECHETS %'), 10),
      surfaceManuelleAllowed: bool(pick(raw, 'SURFACE MANUELLE'), false),
      actif: bool(pick(raw, 'ACTIF'), true),
      visiblePos: bool(pick(raw, 'VISIBLE POS'), true),
      commentaire: pick(raw, 'COMMENTAIRE') || null,
    },
  };
}

export function parsePackagingMarginExcelRow(raw: Record<string, unknown>, line: number) {
  return {
    row: {
      excelId: pick(raw, 'ID', 'id') || null,
      scope: pick(raw, 'SCOPE') || 'global',
      articleId: pick(raw, 'ARTICLE', 'articleId') || 'pkg-boite',
      typeBoite: pick(raw, 'TYPE BOÎTE', 'TYPE BOITE') || null,
      margeDechetsPct: num(pick(raw, 'MARGE DÉCHETS %'), 10),
      beneficePct: num(pick(raw, 'BÉNÉFICE %', 'BENEFICE %'), 30),
      margeDepensePct: num(pick(raw, 'MARGE DÉPENSE %', 'MARGE DEPENSE %'), 10),
      arrondiMode: pick(raw, 'ARRONDI') || 'exact',
      actif: bool(pick(raw, 'ACTIF'), true),
      visiblePos: bool(pick(raw, 'VISIBLE POS'), true),
      commentaire: pick(raw, 'COMMENTAIRE') || null,
    },
  };
}

export function parsePackagingRuleExcelRow(raw: Record<string, unknown>, line: number) {
  return {
    row: {
      excelId: pick(raw, 'ID', 'id') || null,
      articleId: pick(raw, 'ARTICLE') || 'pkg-boite',
      typeCalcul: pick(raw, 'TYPE CALCUL') || 'surface_isf_finitions',
      formule: pick(raw, 'FORMULE') || null,
      sourceImpression: pick(raw, 'SOURCE IMPRESSION') || 'impression_sf',
      sourceFinitions: pick(raw, 'SOURCE FINITIONS') || 'finishing_price',
      utiliseSurface: bool(pick(raw, 'UTILISE SURFACE'), true),
      utiliseBenefice: bool(pick(raw, 'UTILISE BENEFICE'), true),
      utiliseMargeDepense: bool(pick(raw, 'UTILISE MARGE DEPENSE'), true),
      actif: bool(pick(raw, 'ACTIF'), true),
      visiblePos: bool(pick(raw, 'VISIBLE POS'), true),
      commentaire: pick(raw, 'COMMENTAIRE') || null,
    },
  };
}

export function packagingTemplateToExcelRow(t: {
  excelId?: string | null;
  typeBoite: string;
  formuleKey: string;
  formuleSurface?: string | null;
  coeffRabats: number;
  coeffLanguettes: number;
  coeffCollage: number;
  margeDechetsPct: number;
  surfaceManuelleAllowed: boolean;
  actif: boolean;
  visiblePos: boolean;
  commentaire?: string | null;
}) {
  return {
    ID: t.excelId ?? '',
    'TYPE BOÎTE': t.typeBoite,
    'FORMULE SURFACE': t.formuleSurface ?? '',
    'FORMULE KEY': t.formuleKey,
    'COEFFICIENT RABATS': t.coeffRabats,
    'COEFFICIENT LANGUETTES': t.coeffLanguettes,
    'COEFFICIENT COLLAGE': t.coeffCollage,
    'MARGE DÉCHETS %': t.margeDechetsPct,
    'SURFACE MANUELLE': t.surfaceManuelleAllowed ? 'oui' : 'non',
    ACTIF: t.actif ? 'oui' : 'non',
    'VISIBLE POS': t.visiblePos ? 'oui' : 'non',
    COMMENTAIRE: t.commentaire ?? '',
  };
}

export function packagingMarginToExcelRow(m: {
  excelId?: string | null;
  scope: string;
  articleId?: string | null;
  typeBoite?: string | null;
  margeDechetsPct: number;
  beneficePct: number;
  margeDepensePct: number;
  arrondiMode: string;
  actif: boolean;
  visiblePos: boolean;
  commentaire?: string | null;
}) {
  return {
    ID: m.excelId ?? '',
    SCOPE: m.scope,
    ARTICLE: m.articleId ?? '',
    'TYPE BOÎTE': m.typeBoite ?? '',
    'MARGE DÉCHETS %': m.margeDechetsPct,
    'BÉNÉFICE %': m.beneficePct,
    'MARGE DÉPENSE %': m.margeDepensePct,
    ARRONDI: m.arrondiMode,
    ACTIF: m.actif ? 'oui' : 'non',
    'VISIBLE POS': m.visiblePos ? 'oui' : 'non',
    COMMENTAIRE: m.commentaire ?? '',
  };
}

import { formatExcelRowId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';
import { normalizeDirectSaleStatus, parseBoolExcel } from '@/lib/direct-sale/categories';

function pick(raw: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = raw[k] ?? raw[k.toUpperCase()] ?? raw[k.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function num(val: string) {
  const n = Number(String(val).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function boolFlag(val: string, fallback = true) {
  if (!val) return fallback;
  return parseBoolExcel(val);
}

function resolveExcelId(raw: string): string | null {
  const parsed = parseExcelIdColumn(raw);
  return parsed.excelRowId ?? parsed.technicalId ?? null;
}

const ARTICLE_MAP: Record<string, string> = {
  bob: 'tx-bob',
  casquette: 'tx-casquette',
  't-shirt': 'tx-tshirt',
  tshirt: 'tx-tshirt',
  polo: 'tx-polo',
  sweat: 'tx-sweat',
  gilet: 'tx-gilet',
  maillot: 'tx-maillot',
  'tote bag': 'tx-totebag',
  totebag: 'tx-totebag',
  trousse: 'tx-trousse',
  combinaison: 'tx-combinaison',
  'survêtement': 'tx-survetement',
  survetement: 'tx-survetement',
  lambahoany: 'tx-lambahoany',
  'lamba hoany': 'tx-lambahoany',
  tous: '*',
  '*': '*',
};

export function mapTextileArticleLabelToId(label: string): string {
  const s = label.trim().toLowerCase();
  if (ARTICLE_MAP[s]) return ARTICLE_MAP[s]!;
  if (/^tx-/.test(label) || label === '*') return label;
  return label;
}

export const TEXTILE_SUPPORTS_COLUMNS = [
  'ID',
  'ARTICLE',
  'RÉFÉRENCE ARTICLE',
  'TYPE / MODÈLE',
  'MATIÈRE',
  'TAILLE',
  'COULEUR',
  'PRIX SUPPORT VIERGE HT',
  'UNITÉ',
  'VISIBLE POS',
  'STATUT',
  'COMMENTAIRE',
] as const;

export const TEXTILE_MARKING_COLUMNS = [
  'ID',
  'TECHNIQUE',
  'TAILLE MARQUAGE',
  'ZONE MARQUAGE',
  'FORMAT / SURFACE',
  'PRIX MARQUAGE HT',
  'UNITÉ',
  'VISIBLE POS',
  'STATUT',
  'COMMENTAIRE',
] as const;

export const TEXTILE_LABOR_COLUMNS = [
  'ID',
  "TYPE MAIN D’ŒUVRE",
  'TECHNIQUE LIÉE',
  'ARTICLE',
  'PRIX MAIN D’ŒUVRE HT',
  'UNITÉ',
  'VISIBLE POS',
  'STATUT',
  'COMMENTAIRE',
] as const;

export const TEXTILE_RULES_COLUMNS = [
  'ID',
  'ARTICLE',
  'TYPE CALCUL',
  'FORMULE',
  'UTILISE SUPPORT VIERGE',
  'UTILISE MARQUAGE',
  'UTILISE MAIN D’ŒUVRE',
  'UTILISE SURFACE M²',
  'EXCEPTION LAMBAHOANY',
  'VISIBLE POS',
  'STATUT',
  'COMMENTAIRE',
] as const;

export const TEXTILE_TIERS_COLUMNS = [
  'ID',
  'ARTICLE',
  'QUANTITÉ MIN',
  'QUANTITÉ MAX',
  'TYPE REMISE',
  'VALEUR REMISE',
  'STATUT',
  'COMMENTAIRE',
] as const;

export function parseTextileSupportExcelRow(raw: Record<string, unknown>, line: number) {
  const articleRaw = pick(raw, 'ARTICLE', 'article');
  if (!articleRaw) return { error: `Ligne ${line} : ARTICLE requis` as const };
  return {
    row: {
      excelId: resolveExcelId(pick(raw, 'ID')) ?? (pick(raw, 'ID') || null),
      articleId: mapTextileArticleLabelToId(articleRaw),
      articleRef: pick(raw, 'RÉFÉRENCE ARTICLE', 'REFERENCE', 'articleRef') || null,
      typeModele: pick(raw, 'TYPE / MODÈLE', 'TYPE', 'MODELE', 'typeModele') || null,
      matiere: pick(raw, 'MATIÈRE', 'MATIERE', 'matiere') || null,
      taille: pick(raw, 'TAILLE', 'taille') || null,
      couleur: pick(raw, 'COULEUR', 'couleur') || null,
      prixSupportVierge: num(pick(raw, 'PRIX SUPPORT VIERGE HT', 'PRIX SUPPORT', 'PRIX', 'prix')),
      unit: pick(raw, 'UNITÉ', 'UNITE', 'unit') || 'pièce',
      visiblePOS: boolFlag(pick(raw, 'VISIBLE POS'), true),
      status: normalizeDirectSaleStatus(pick(raw, 'STATUT') || 'published'),
      active: true,
      details: pick(raw, 'COMMENTAIRE', 'DETAIL', 'details') || null,
    },
  };
}

export function textileSupportToExcelRow(row: {
  excelId?: string | null;
  articleId: string;
  articleRef?: string | null;
  typeModele?: string | null;
  matiere?: string | null;
  taille?: string | null;
  couleur?: string | null;
  prixSupportVierge: number;
  unit: string;
  visiblePOS: boolean;
  status: string;
  details?: string | null;
}) {
  return {
    ID: row.excelId ?? '',
    ARTICLE: row.articleId,
    'RÉFÉRENCE ARTICLE': row.articleRef ?? '',
    'TYPE / MODÈLE': row.typeModele ?? '',
    MATIÈRE: row.matiere ?? '',
    TAILLE: row.taille ?? '',
    COULEUR: row.couleur ?? '',
    'PRIX SUPPORT VIERGE HT': row.prixSupportVierge,
    UNITÉ: row.unit,
    'VISIBLE POS': row.visiblePOS ? 'oui' : 'non',
    STATUT: row.status,
    COMMENTAIRE: row.details ?? '',
  };
}

export function parseTextileMarkingExcelRow(raw: Record<string, unknown>, line: number) {
  const technique = pick(raw, 'TECHNIQUE', 'technique');
  if (!technique) return { error: `Ligne ${line} : TECHNIQUE requise` as const };
  return {
    row: {
      excelId: resolveExcelId(pick(raw, 'ID')) ?? (pick(raw, 'ID') || null),
      technique,
      tailleMarquage: pick(raw, 'TAILLE MARQUAGE', 'tailleMarquage') || null,
      zoneMarquage: pick(raw, 'ZONE MARQUAGE', 'zoneMarquage') || null,
      formatSurface: pick(raw, 'FORMAT / SURFACE', 'formatSurface') || null,
      prixMarquage: num(pick(raw, 'PRIX MARQUAGE HT', 'PRIX MARQUAGE', 'PRIX')),
      unit: pick(raw, 'UNITÉ', 'UNITE') || 'pièce',
      visiblePOS: boolFlag(pick(raw, 'VISIBLE POS'), true),
      status: normalizeDirectSaleStatus(pick(raw, 'STATUT') || 'published'),
      active: true,
      details: pick(raw, 'COMMENTAIRE', 'DETAIL') || null,
    },
  };
}

export function textileMarkingToExcelRow(row: {
  excelId?: string | null;
  technique: string;
  tailleMarquage?: string | null;
  zoneMarquage?: string | null;
  formatSurface?: string | null;
  prixMarquage: number;
  unit: string;
  visiblePOS: boolean;
  status: string;
  details?: string | null;
}) {
  return {
    ID: row.excelId ?? '',
    TECHNIQUE: row.technique,
    'TAILLE MARQUAGE': row.tailleMarquage ?? '',
    'ZONE MARQUAGE': row.zoneMarquage ?? '',
    'FORMAT / SURFACE': row.formatSurface ?? '',
    'PRIX MARQUAGE HT': row.prixMarquage,
    UNITÉ: row.unit,
    'VISIBLE POS': row.visiblePOS ? 'oui' : 'non',
    STATUT: row.status,
    COMMENTAIRE: row.details ?? '',
  };
}

export function parseTextileLaborExcelRow(raw: Record<string, unknown>, line: number) {
  const typeLabor = pick(raw, "TYPE MAIN D’ŒUVRE", "TYPE MAIN D'ŒUVRE", 'TYPE', 'typeLabor');
  if (!typeLabor) return { error: `Ligne ${line} : TYPE MAIN D’ŒUVRE requis` as const };
  return {
    row: {
      excelId: resolveExcelId(pick(raw, 'ID')) ?? (pick(raw, 'ID') || null),
      typeLabor,
      techniqueLiee: pick(raw, 'TECHNIQUE LIÉE', 'TECHNIQUE LIEE', 'techniqueLiee') || null,
      articleId: mapTextileArticleLabelToId(pick(raw, 'ARTICLE', 'article') || '*'),
      prixLabor: num(pick(raw, "PRIX MAIN D’ŒUVRE HT", "PRIX MAIN D'ŒUVRE HT", 'PRIX')),
      unit: pick(raw, 'UNITÉ', 'UNITE') || 'pièce',
      visiblePOS: boolFlag(pick(raw, 'VISIBLE POS'), true),
      status: normalizeDirectSaleStatus(pick(raw, 'STATUT') || 'published'),
      active: true,
      details: pick(raw, 'COMMENTAIRE', 'DETAIL') || null,
    },
  };
}

export function textileLaborToExcelRow(row: {
  excelId?: string | null;
  typeLabor: string;
  techniqueLiee?: string | null;
  articleId: string;
  prixLabor: number;
  unit: string;
  visiblePOS: boolean;
  status: string;
  details?: string | null;
}) {
  return {
    ID: row.excelId ?? '',
    "TYPE MAIN D’ŒUVRE": row.typeLabor,
    'TECHNIQUE LIÉE': row.techniqueLiee ?? '',
    ARTICLE: row.articleId,
    "PRIX MAIN D’ŒUVRE HT": row.prixLabor,
    UNITÉ: row.unit,
    'VISIBLE POS': row.visiblePOS ? 'oui' : 'non',
    STATUT: row.status,
    COMMENTAIRE: row.details ?? '',
  };
}

export function parseTextileRuleExcelRow(raw: Record<string, unknown>, line: number) {
  const articleRaw = pick(raw, 'ARTICLE', 'article');
  if (!articleRaw) return { error: `Ligne ${line} : ARTICLE requis` as const };
  return {
    row: {
      excelId: resolveExcelId(pick(raw, 'ID')) ?? (pick(raw, 'ID') || null),
      articleId: mapTextileArticleLabelToId(articleRaw),
      typeCalcul: pick(raw, 'TYPE CALCUL', 'typeCalcul') || 'STANDARD',
      formula: pick(raw, 'FORMULE', 'formula') || null,
      utiliseSupportVierge: boolFlag(pick(raw, 'UTILISE SUPPORT VIERGE'), true),
      utiliseMarquage: boolFlag(pick(raw, 'UTILISE MARQUAGE'), true),
      utiliseMainOeuvre: boolFlag(pick(raw, 'UTILISE MAIN D’ŒUVRE', "UTILISE MAIN D'ŒUVRE"), true),
      utiliseSurfaceM2: boolFlag(pick(raw, 'UTILISE SURFACE M²', 'UTILISE SURFACE M2'), false),
      exceptionLambahoany: boolFlag(pick(raw, 'EXCEPTION LAMBAHOANY'), false),
      visiblePOS: boolFlag(pick(raw, 'VISIBLE POS'), true),
      status: normalizeDirectSaleStatus(pick(raw, 'STATUT') || 'published'),
      active: true,
      details: pick(raw, 'COMMENTAIRE', 'DETAIL') || null,
    },
  };
}

export function textileRuleToExcelRow(row: {
  excelId?: string | null;
  articleId: string;
  typeCalcul: string;
  formula?: string | null;
  utiliseSupportVierge: boolean;
  utiliseMarquage: boolean;
  utiliseMainOeuvre: boolean;
  utiliseSurfaceM2: boolean;
  exceptionLambahoany: boolean;
  visiblePOS: boolean;
  status: string;
  details?: string | null;
}) {
  return {
    ID: row.excelId ?? '',
    ARTICLE: row.articleId,
    'TYPE CALCUL': row.typeCalcul,
    FORMULE: row.formula ?? '',
    'UTILISE SUPPORT VIERGE': row.utiliseSupportVierge ? 'oui' : 'non',
    'UTILISE MARQUAGE': row.utiliseMarquage ? 'oui' : 'non',
    'UTILISE MAIN D’ŒUVRE': row.utiliseMainOeuvre ? 'oui' : 'non',
    'UTILISE SURFACE M²': row.utiliseSurfaceM2 ? 'oui' : 'non',
    'EXCEPTION LAMBAHOANY': row.exceptionLambahoany ? 'oui' : 'non',
    'VISIBLE POS': row.visiblePOS ? 'oui' : 'non',
    STATUT: row.status,
    COMMENTAIRE: row.details ?? '',
  };
}

export function parseTextileTierExcelRow(raw: Record<string, unknown>, line: number) {
  const articleRaw = pick(raw, 'ARTICLE', 'article');
  if (!articleRaw) return { error: `Ligne ${line} : ARTICLE requis` as const };
  const qtyMaxRaw = pick(raw, 'QUANTITÉ MAX', 'QTY MAX', 'qtyMax');
  return {
    row: {
      excelId: resolveExcelId(pick(raw, 'ID')) ?? (pick(raw, 'ID') || null),
      articleId: mapTextileArticleLabelToId(articleRaw),
      qtyMin: Math.max(1, Math.floor(num(pick(raw, 'QUANTITÉ MIN', 'QTY MIN', 'qtyMin')) || 1)),
      qtyMax: qtyMaxRaw ? Math.floor(num(qtyMaxRaw)) : null,
      typeRemise: pick(raw, 'TYPE REMISE', 'typeRemise') || 'percent',
      valeurRemise: num(pick(raw, 'VALEUR REMISE', 'valeurRemise')),
      status: normalizeDirectSaleStatus(pick(raw, 'STATUT') || 'published'),
      active: true,
      details: pick(raw, 'COMMENTAIRE', 'DETAIL') || null,
    },
  };
}

export function textileTierToExcelRow(row: {
  excelId?: string | null;
  articleId: string;
  qtyMin: number;
  qtyMax?: number | null;
  typeRemise: string;
  valeurRemise: number;
  status: string;
  details?: string | null;
}) {
  return {
    ID: row.excelId ?? '',
    ARTICLE: row.articleId,
    'QUANTITÉ MIN': row.qtyMin,
    'QUANTITÉ MAX': row.qtyMax ?? '',
    'TYPE REMISE': row.typeRemise,
    'VALEUR REMISE': row.valeurRemise,
    STATUT: row.status,
    COMMENTAIRE: row.details ?? '',
  };
}

export { formatExcelRowId };

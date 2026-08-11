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

function resolveExcelId(raw: string): string | null {
  const parsed = parseExcelIdColumn(raw);
  return parsed.excelRowId ?? parsed.technicalId ?? null;
}

function mapArticleLabelToId(label: string): string {
  const s = label.trim().toLowerCase();
  const map: Record<string, string> = {
    'tapis souris': 'gd-tapis',
    tapis: 'gd-tapis',
    stylo: 'gd-stylo',
    'porte-clé': 'gd-portecles',
    'porte-cles': 'gd-portecles',
    'porte-clés': 'gd-portecles',
    "pin's": 'gd-pins',
    "pin's / badge": 'gd-pins',
    badge: 'gd-pins',
    parapluie: 'gd-parapluie',
    mug: 'gd-mug',
    'housse personnalisée': 'gd-housse',
    housse: 'gd-housse',
    gourde: 'gd-gourde',
    'clé usb': 'gd-usb',
    usb: 'gd-usb',
    briquet: 'gd-briquet',
    assiette: 'gd-tasse',
  };
  if (map[s]) return map[s]!;
  if (/^gd-/.test(label)) return label;
  return label;
}

export const GOODIES_MODELS_COLUMNS = [
  'ID', 'ARTICLE', 'TYPE / MODÈLE', 'MATIÈRE', 'FORMAT / DIMENSION',
  'LARGEUR MM', 'HAUTEUR MM', 'DIAMÈTRE MM', 'CONTENANCE', 'CAPACITÉ',
  'INTERFACE', 'PANNEAUX', 'PRIX VIERGE', 'UNITÉ', 'CHAMP POS',
  'VISIBLE POS', 'ACTIF', 'DÉTAIL',
] as const;

export const GOODIES_TECHNIQUES_COLUMNS = [
  'ID', 'ARTICLE', 'TECHNIQUE', 'MATIÈRE COMPATIBLE', 'TYPE COMPATIBLE',
  'PRIX TECHNIQUE', 'UNITÉ', 'VISIBLE POS', 'ACTIF', 'DÉTAIL',
] as const;

export const GOODIES_ADDONS_COLUMNS = [
  'ID', 'ARTICLE', 'SUPPLÉMENT', 'TYPE', 'PRIX', 'UNITÉ', 'CHAMP POS',
  'OBLIGATOIRE', 'VISIBLE POS', 'ACTIF', 'DÉTAIL',
] as const;

export const GOODIES_DEPS_COLUMNS = [
  'ID', 'ARTICLE', 'OPTION SOURCE', 'VALEUR SOURCE', 'OPTION CIBLE',
  'VALEURS AUTORISÉES', 'ACTION', 'ACTIF', 'DÉTAIL',
] as const;

export function parseGoodiesModelExcelRow(raw: Record<string, unknown>, line: number) {
  const articleRaw = pick(raw, 'ARTICLE', 'article', 'articleId');
  const typeModele = pick(raw, 'TYPE / MODÈLE', 'TYPE', 'MODÈLE', 'modele', 'typeModele');
  if (!articleRaw || !typeModele) {
    return { error: `Ligne ${line} : ARTICLE et TYPE / MODÈLE requis` as const };
  }
  return {
    row: {
      excelId: resolveExcelId(pick(raw, 'ID')) ?? (pick(raw, 'ID') || null),
      articleId: mapArticleLabelToId(articleRaw),
      typeModele,
      matiere: pick(raw, 'MATIÈRE', 'matiere') || null,
      formatDimension: pick(raw, 'FORMAT / DIMENSION', 'FORMAT', 'format') || null,
      widthMm: num(pick(raw, 'LARGEUR MM', 'largeur')) || null,
      heightMm: num(pick(raw, 'HAUTEUR MM', 'hauteur')) || null,
      diameterMm: num(pick(raw, 'DIAMÈTRE MM', 'diametre')) || null,
      contenance: pick(raw, 'CONTENANCE', 'contenance') || null,
      capacite: pick(raw, 'CAPACITÉ', 'CAPACITE', 'capacite') || null,
      interfaceUsb: pick(raw, 'INTERFACE', 'interface') || null,
      panneaux: pick(raw, 'PANNEAUX', 'panneaux') || null,
      prixVierge: num(pick(raw, 'PRIX VIERGE', 'PRIX', 'prix')),
      unit: pick(raw, 'UNITÉ', 'unite') || 'pièce',
      fieldKey: pick(raw, 'CHAMP POS', 'fieldKey') || 'type',
      visiblePOS: parseBoolExcel(pick(raw, 'VISIBLE POS') || 'oui'),
      active: parseBoolExcel(pick(raw, 'ACTIF') || 'oui'),
      details: pick(raw, 'DÉTAIL', 'DETAIL', 'detail') || null,
      status: normalizeDirectSaleStatus(pick(raw, 'STATUT') || 'published'),
    },
  };
}

export function goodiesModelToExcelRow(row: {
  excelId?: string | null;
  articleId: string;
  typeModele: string;
  matiere?: string | null;
  formatDimension?: string | null;
  widthMm?: number | null;
  heightMm?: number | null;
  diameterMm?: number | null;
  contenance?: string | null;
  capacite?: string | null;
  interfaceUsb?: string | null;
  panneaux?: string | null;
  prixVierge: number;
  unit: string;
  fieldKey: string;
  visiblePOS: boolean;
  active: boolean;
  details?: string | null;
}) {
  return {
    ID: row.excelId ?? '',
    ARTICLE: row.articleId,
    'TYPE / MODÈLE': row.typeModele,
    MATIÈRE: row.matiere ?? '',
    'FORMAT / DIMENSION': row.formatDimension ?? '',
    'LARGEUR MM': row.widthMm ?? '',
    'HAUTEUR MM': row.heightMm ?? '',
    'DIAMÈTRE MM': row.diameterMm ?? '',
    CONTENANCE: row.contenance ?? '',
    CAPACITÉ: row.capacite ?? '',
    INTERFACE: row.interfaceUsb ?? '',
    PANNEAUX: row.panneaux ?? '',
    'PRIX VIERGE': row.prixVierge,
    UNITÉ: row.unit,
    'CHAMP POS': row.fieldKey,
    'VISIBLE POS': row.visiblePOS ? 'oui' : 'non',
    ACTIF: row.active ? 'oui' : 'non',
    DÉTAIL: row.details ?? '',
  };
}

export function parseGoodiesTechniqueExcelRow(raw: Record<string, unknown>, line: number) {
  const articleRaw = pick(raw, 'ARTICLE', 'article');
  const technique = pick(raw, 'TECHNIQUE', 'technique');
  if (!articleRaw || !technique) {
    return { error: `Ligne ${line} : ARTICLE et TECHNIQUE requis` as const };
  }
  return {
    row: {
      excelId: resolveExcelId(pick(raw, 'ID')) ?? (pick(raw, 'ID') || null),
      articleId: mapArticleLabelToId(articleRaw),
      technique,
      matiereCompatible: pick(raw, 'MATIÈRE COMPATIBLE') || null,
      typeCompatible: pick(raw, 'TYPE COMPATIBLE') || null,
      prixTechnique: num(pick(raw, 'PRIX TECHNIQUE', 'PRIX', 'prix')),
      unit: pick(raw, 'UNITÉ') || 'pièce',
      visiblePOS: parseBoolExcel(pick(raw, 'VISIBLE POS') || 'oui'),
      active: parseBoolExcel(pick(raw, 'ACTIF') || 'oui'),
      details: pick(raw, 'DÉTAIL') || null,
      status: normalizeDirectSaleStatus(pick(raw, 'STATUT') || 'published'),
    },
  };
}

export function goodiesTechniqueToExcelRow(row: {
  excelId?: string | null;
  articleId: string;
  technique: string;
  matiereCompatible?: string | null;
  typeCompatible?: string | null;
  prixTechnique: number;
  unit: string;
  visiblePOS: boolean;
  active: boolean;
  details?: string | null;
}) {
  return {
    ID: row.excelId ?? '',
    ARTICLE: row.articleId,
    TECHNIQUE: row.technique,
    'MATIÈRE COMPATIBLE': row.matiereCompatible ?? '',
    'TYPE COMPATIBLE': row.typeCompatible ?? '',
    'PRIX TECHNIQUE': row.prixTechnique,
    UNITÉ: row.unit,
    'VISIBLE POS': row.visiblePOS ? 'oui' : 'non',
    ACTIF: row.active ? 'oui' : 'non',
    DÉTAIL: row.details ?? '',
  };
}

export function parseGoodiesAddonExcelRow(raw: Record<string, unknown>, line: number) {
  const articleRaw = pick(raw, 'ARTICLE', 'article');
  const name = pick(raw, 'SUPPLÉMENT', 'NAME', 'name');
  if (!articleRaw || !name) {
    return { error: `Ligne ${line} : ARTICLE et SUPPLÉMENT requis` as const };
  }
  return {
    row: {
      excelId: resolveExcelId(pick(raw, 'ID')) ?? (pick(raw, 'ID') || null),
      articleId: mapArticleLabelToId(articleRaw),
      name,
      type: pick(raw, 'TYPE') || 'option',
      price: num(pick(raw, 'PRIX', 'prix')),
      unit: pick(raw, 'UNITÉ') || 'pièce',
      fieldKey: pick(raw, 'CHAMP POS', 'fieldKey') || 'supplements',
      required: parseBoolExcel(pick(raw, 'OBLIGATOIRE') || 'non'),
      visiblePOS: parseBoolExcel(pick(raw, 'VISIBLE POS') || 'oui'),
      active: parseBoolExcel(pick(raw, 'ACTIF') || 'oui'),
      details: pick(raw, 'DÉTAIL') || null,
      status: normalizeDirectSaleStatus(pick(raw, 'STATUT') || 'published'),
    },
  };
}

export function goodiesAddonToExcelRow(row: {
  excelId?: string | null;
  articleId: string;
  name: string;
  type: string;
  price: number;
  unit: string;
  fieldKey: string;
  required: boolean;
  visiblePOS: boolean;
  active: boolean;
  details?: string | null;
}) {
  return {
    ID: row.excelId ?? '',
    ARTICLE: row.articleId,
    SUPPLÉMENT: row.name,
    TYPE: row.type,
    PRIX: row.price,
    UNITÉ: row.unit,
    'CHAMP POS': row.fieldKey,
    OBLIGATOIRE: row.required ? 'oui' : 'non',
    'VISIBLE POS': row.visiblePOS ? 'oui' : 'non',
    ACTIF: row.active ? 'oui' : 'non',
    DÉTAIL: row.details ?? '',
  };
}

export function parseGoodiesDepExcelRow(raw: Record<string, unknown>, line: number) {
  const articleRaw = pick(raw, 'ARTICLE', 'article');
  const sourceField = pick(raw, 'OPTION SOURCE', 'sourceField');
  const sourceValue = pick(raw, 'VALEUR SOURCE', 'sourceValue');
  const targetField = pick(raw, 'OPTION CIBLE', 'targetField');
  const allowedValues = pick(raw, 'VALEURS AUTORISÉES', 'allowedValues');
  if (!articleRaw || !sourceField || !sourceValue || !targetField) {
    return { error: `Ligne ${line} : ARTICLE, OPTION SOURCE/VALEUR/CIBLE requis` as const };
  }
  return {
    row: {
      excelId: resolveExcelId(pick(raw, 'ID')) ?? (pick(raw, 'ID') || null),
      articleId: mapArticleLabelToId(articleRaw),
      sourceField,
      sourceValue,
      targetField,
      allowedValues: allowedValues || '',
      action: pick(raw, 'ACTION') || 'filter',
      active: parseBoolExcel(pick(raw, 'ACTIF') || 'oui'),
      details: pick(raw, 'DÉTAIL') || null,
    },
  };
}

export function goodiesDepToExcelRow(row: {
  excelId?: string | null;
  articleId: string;
  sourceField: string;
  sourceValue: string;
  targetField: string;
  allowedValues: string;
  action: string;
  active: boolean;
  details?: string | null;
}) {
  return {
    ID: row.excelId ?? '',
    ARTICLE: row.articleId,
    'OPTION SOURCE': row.sourceField,
    'VALEUR SOURCE': row.sourceValue,
    'OPTION CIBLE': row.targetField,
    'VALEURS AUTORISÉES': row.allowedValues,
    ACTION: row.action,
    ACTIF: row.active ? 'oui' : 'non',
    DÉTAIL: row.details ?? '',
  };
}

export { formatExcelRowId, mapArticleLabelToId };

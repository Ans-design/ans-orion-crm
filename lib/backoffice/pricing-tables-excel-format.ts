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

// ─── Finitions & Reliures ───────────────────────────────────────────────────

export const FINISHING_EXCEL_COLUMNS = [
  'ID', 'FINITION', 'FAMILLE', 'TYPE', 'RÉFÉRENCE', 'FORMAT', 'DIAMÈTRE',
  'NOMBRE PAGES MIN', 'NOMBRE PAGES MAX', 'UNITÉ', 'PRIX',
  'VISIBLE POS', 'ACTIF', 'DÉTAIL',
] as const;

export function parseFinishingExcelRow(raw: Record<string, unknown>, line: number) {
  const baseName = pick(raw, 'FINITION', 'finition', 'LIBELLÉ', 'libellé', 'name');
  if (!baseName) return { error: `Ligne ${line} : FINITION / LIBELLÉ requis` as const };
  const formulaRaw = pick(raw, 'FORMULE', 'formule').toLowerCase();
  let formulaType = 'fixed';
  if (formulaRaw.includes('m2') || formulaRaw.includes('m²')) formulaType = 'per_m2';
  else if (formulaRaw.includes('feuille') || formulaRaw.includes('sheet')) formulaType = 'per_sheet';
  else if (formulaRaw.includes('unit') || formulaRaw.includes('mètre') || formulaRaw.includes('ml')) formulaType = 'per_unit';

  const formatRef =
    pick(raw, 'RÉFÉRENCE', 'reference')
    || pick(raw, 'DIAMÈTRE', 'diametre', 'DIAMETRE')
    || pick(raw, 'FORMAT / RÉFÉRENCE', 'FORMAT', 'format');
  // Distinguer les variantes (ex. spirales 6 mm / 8 mm) — restent lignes Admin, pas cartes POS
  const name = formatRef && !baseName.includes(formatRef) ? `${baseName} — ${formatRef}` : baseName;
  const pagesMin = pick(raw, 'NOMBRE PAGES MIN', 'PAGES MIN', 'pages min');
  const pagesMax = pick(raw, 'NOMBRE PAGES MAX', 'PAGES MAX', 'pages max');
  const detailParts = [
    pagesMin || pagesMax
      ? `pages ${pagesMin || '?'}-${pagesMax || '?'}`
      : '',
    pick(raw, 'QTÉ / PALIER'),
    pick(raw, 'NOTE', 'DÉTAIL', 'detail'),
  ].filter(Boolean);

  const famille = pick(raw, 'FAMILLE', 'famille', 'FAMILLES COMPATIBLES', 'familles compatibles');
  const typeCat = pick(raw, 'TYPE', 'type') || 'finition';

  return {
    row: {
      excelId: resolveExcelId(pick(raw, 'ID')) ?? (pick(raw, 'ID') || null),
      name,
      category: typeCat,
      compatibleFamilies: famille || null,
      unit: pick(raw, 'UNITÉ', 'unite') || 'pièce',
      unitPrice: num(pick(raw, 'PRIX', 'prix', 'PRIX BASE (Ar)', 'PRIX BASE')),
      minQuantity: parseInt(pick(raw, 'QTÉ MIN', 'qte min'), 10) || 1,
      formulaType,
      // VISIBLE POS = disponible en option configurateur (pas carte séparée pour les variantes)
      visiblePOS: parseBoolExcel(pick(raw, 'VISIBLE POS', 'visible pos') || 'oui'),
      active: parseBoolExcel(pick(raw, 'ACTIF', 'actif') || 'oui'),
      reference: formatRef || null,
      details: detailParts.join(' — ') || null,
      status: normalizeDirectSaleStatus(pick(raw, 'STATUT', 'statut') || (parseBoolExcel(pick(raw, 'ACTIF') || 'oui') ? 'published' : 'draft')),
    },
  };
}

export function finishingToExcelRow(row: {
  excelId?: string | null;
  name: string;
  category: string;
  compatibleFamilies?: string | null;
  unit: string;
  unitPrice: number;
  minQuantity: number;
  formulaType: string;
  visiblePOS: boolean;
  active: boolean;
  reference?: string | null;
  details?: string | null;
  status: string;
}) {
  const diamMatch = (row.reference ?? row.name).match(/(\d+\s*mm(?:\s*\/\s*[\d/]+″?)?)/i);
  const formatMatch = (row.reference ?? row.name).match(/\b(A6\/A5\/A4|A[0-6]\+?)\b/i);
  const pagesMatch = (row.details ?? '').match(/pages\s+(\d+|\?)\s*[-–]\s*(\d+|\?)/i);
  const finitionBase = row.name.replace(/\s*—\s*.+$/, '').trim() || row.name;

  return {
    ID: row.excelId ?? '',
    FINITION: finitionBase,
    FAMILLE: row.compatibleFamilies ?? row.category,
    TYPE: row.category,
    RÉFÉRENCE: row.reference ?? '',
    FORMAT: formatMatch?.[1] ?? '',
    DIAMÈTRE: diamMatch?.[1] ?? '',
    'NOMBRE PAGES MIN': pagesMatch?.[1] ?? '',
    'NOMBRE PAGES MAX': pagesMatch?.[2] ?? '',
    UNITÉ: row.unit,
    PRIX: row.unitPrice,
    'VISIBLE POS': row.visiblePOS ? 'oui' : 'non',
    ACTIF: row.active ? 'oui' : 'non',
    DÉTAIL: row.details ?? '',
  };
}

// ─── Grand format ───────────────────────────────────────────────────────────

export const GRAND_FORMAT_EXCEL_COLUMNS = [
  'ID', 'ARTICLE', 'MATIÈRE', 'RÉFÉRENCE', 'LAIZE', 'UNITÉ', 'PRIX M2', 'PRIX ML', 'QTÉ MIN',
  'RÈGLE ARRONDI', 'VISIBLE POS', 'ACTIF', 'STATUT', 'DÉTAIL',
] as const;

/** Feuille Excel marges découpe A0–A5. */
export const GF_CUTTING_MARGIN_EXCEL_COLUMNS = [
  'ID', 'FORMAT', 'RATIO SURFACE', 'MARGE %', 'ACTIF', 'COMMENTAIRE',
] as const;

export function parseGrandFormatExcelRow(raw: Record<string, unknown>, line: number) {
  const name = pick(raw, 'ARTICLE', 'article', 'name');
  if (!name) return { error: `Ligne ${line} : ARTICLE requis` as const };
  const laizeRaw = pick(raw, 'LAIZE', 'laize');
  const laizeMatch = laizeRaw.match(/(\d+(?:[.,]\d+)?)/);
  const laize = laizeMatch ? num(laizeMatch[1]!) : null;
  const material = pick(raw, 'MATIÈRE / SUPPORT', 'MATIÈRE', 'matiere', 'materialKey');
  const unitPriceMax = num(pick(raw, 'PRIX UNITAIRE MAX (Ar)', 'PRIX UNITAIRE MAX', 'PRIX BASE', 'prix base'));
  const details = [
    pick(raw, 'FORMAT / DIMENSIONS'),
    pick(raw, 'RÈGLE CALCUL'),
    pick(raw, 'NOTE', 'DÉTAIL', 'detail'),
  ].filter(Boolean).join(' — ') || null;

  return {
    row: {
      excelId: resolveExcelId(pick(raw, 'ID')) ?? (pick(raw, 'ID') || null),
      name,
      materialKey: material || null,
      materialName: material || null,
      laize,
      unit: pick(raw, 'UNITÉ', 'unite') || 'm²',
      pricePerM2: num(pick(raw, 'PRIX M2', 'prix m2', 'PRIX M2 (Ar)')) || null,
      pricePerLinearMeter: num(pick(raw, 'PRIX ML', 'prix ml', 'PRIX ML (Ar)')) || null,
      basePrice: unitPriceMax || null,
      marginRule: pick(raw, 'RÈGLE ARRONDI', 'RÈGLE CALCUL', 'regle arrondi') || null,
      visiblePOS: parseBoolExcel(pick(raw, 'VISIBLE POS') || 'oui'),
      active: parseBoolExcel(pick(raw, 'ACTIF') || 'oui'),
      reference: pick(raw, 'RÉFÉRENCE', 'reference') || pick(raw, 'ID') || null,
      details,
      status: normalizeDirectSaleStatus(pick(raw, 'STATUT') || (parseBoolExcel(pick(raw, 'ACTIF') || 'oui') ? 'published' : 'draft')),
    },
  };
}

export function grandFormatToExcelRow(row: {
  excelId?: string | null;
  name: string;
  materialKey?: string | null;
  laize?: number | null;
  unit: string;
  pricePerM2?: number | null;
  pricePerLinearMeter?: number | null;
  minQuantity?: number;
  marginRule?: string | null;
  visiblePOS: boolean;
  active: boolean;
  reference?: string | null;
  details?: string | null;
  status?: string | null;
}) {
  return {
    ID: row.excelId ?? '',
    ARTICLE: row.name,
    MATIÈRE: row.materialKey ?? '',
    RÉFÉRENCE: row.reference ?? '',
    LAIZE: row.laize ?? '',
    UNITÉ: row.unit,
    'PRIX M2': row.pricePerM2 ?? '',
    'PRIX ML': row.pricePerLinearMeter ?? '',
    'QTÉ MIN': row.minQuantity ?? 1,
    'RÈGLE ARRONDI': row.marginRule ?? '',
    'VISIBLE POS': row.visiblePOS ? 'oui' : 'non',
    ACTIF: row.active ? 'oui' : 'non',
    STATUT: row.status ?? '',
    DÉTAIL: row.details ?? '',
  };
}

// ─── Design graphique ─────────────────────────────────────────────────────

export const DESIGN_EXCEL_COLUMNS = [
  'ID', 'PRESTATION', 'CATÉGORIE', 'TYPE', 'UNITÉ', 'PRIX', 'DÉLAI',
  'RÉVISIONS INCLUSES', 'VISIBLE POS', 'ACTIF', 'DÉTAIL',
] as const;

export function parseDesignExcelRow(raw: Record<string, unknown>, line: number) {
  const name = pick(raw, 'PRESTATION', 'prestation', 'SERVICE', 'service', 'name');
  if (!name) return { error: `Ligne ${line} : PRESTATION / SERVICE requis` as const };
  return {
    row: {
      excelId: resolveExcelId(pick(raw, 'ID')) ?? (pick(raw, 'ID') || null),
      name,
      category: pick(raw, 'CATÉGORIE', 'categorie') || 'design',
      serviceType: pick(raw, 'TYPE', 'TYPE SERVICE', 'type') || null,
      unit: pick(raw, 'UNITÉ', 'unite') || 'prestation',
      unitPrice: num(pick(raw, 'PRIX', 'prix', 'PRIX UNITAIRE (Ar)', 'PRIX UNITAIRE')),
      estimatedTime: pick(raw, 'DÉLAI', 'DÉLAI STANDARD', 'delai') || null,
      revisionIncluded: parseInt(pick(raw, 'RÉVISIONS INCLUSES', 'revisions'), 10) || 0,
      visiblePOS: parseBoolExcel(pick(raw, 'VISIBLE POS') || 'oui'),
      active: parseBoolExcel(pick(raw, 'ACTIF') || 'oui'),
      reference: pick(raw, 'RÉFÉRENCE', 'reference') || pick(raw, 'ID') || null,
      details: pick(raw, 'DÉTAIL', 'NOTE', 'detail') || null,
      status: normalizeDirectSaleStatus(pick(raw, 'STATUT') || 'draft'),
    },
  };
}

export function designToExcelRow(row: {
  excelId?: string | null;
  name: string;
  category: string;
  serviceType?: string | null;
  unit: string;
  unitPrice: number;
  estimatedTime?: string | null;
  revisionIncluded: number;
  visiblePOS: boolean;
  active: boolean;
  reference?: string | null;
  details?: string | null;
}) {
  return {
    ID: row.excelId ?? '',
    PRESTATION: row.name,
    CATÉGORIE: row.category,
    TYPE: row.serviceType ?? '',
    UNITÉ: row.unit,
    PRIX: row.unitPrice,
    DÉLAI: row.estimatedTime ?? '',
    'RÉVISIONS INCLUSES': row.revisionIncluded,
    'VISIBLE POS': row.visiblePOS ? 'oui' : 'non',
    ACTIF: row.active ? 'oui' : 'non',
    DÉTAIL: row.details ?? '',
  };
}

export type ImportReport = {
  read: number;
  created: number;
  updated: number;
  errors: number;
  synced: number;
  issues: Array<{ line: number; reason: string }>;
};

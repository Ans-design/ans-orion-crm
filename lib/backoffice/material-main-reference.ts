import type { CharacteristicType } from '@/lib/backoffice/material-table-fields';
import { parseCharacteristicTypeLabel } from '@/lib/backoffice/material-import-key';

const COLOR_WORDS = [
  'blanc',
  'noir',
  'transparent',
  'rouge',
  'bleu',
  'vert',
  'jaune',
  'gris',
  'beige',
  'or',
  'argent',
];

const INVALID_MATERIAL_NAMES = new Set([
  '',
  '—',
  '-',
  'null',
  'undefined',
  'matière article',
  'matiere article',
  'sans nom',
  'à compléter',
  'a completer',
]);

export function isValidMaterialName(name: string): boolean {
  const t = name.trim().toLowerCase();
  if (!t) return false;
  return !INVALID_MATERIAL_NAMES.has(t);
}

export function normalizePriceUnit(raw: string): string {
  const t = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/²/g, '2')
    .replace(/\s+/g, ' ');
  const map: Record<string, string> = {
    feuille: 'feuille',
    m2: 'm2',
    'm²': 'm2',
    cm2: 'cm2',
    'cm²': 'cm2',
    piece: 'pièce',
    pièce: 'pièce',
    pcs: 'pcs',
    plaque: 'plaque',
    rouleau: 'rouleau',
    'metre lineaire': 'mètre linéaire',
    'mètre linéaire': 'mètre linéaire',
    kg: 'kg',
    lot: 'lot',
  };
  return map[t] ?? raw.trim();
}

export function characteristicTypeLabel(type: CharacteristicType | string): string {
  const labels: Record<string, string> = {
    grammage: 'grammage',
    epaisseur: 'épaisseur',
    laize: 'laize',
    format: 'format',
    taille: 'taille',
    face: 'face',
    finition: 'finition',
    couleur: 'couleur',
    autre: 'autre',
  };
  const parsed = parseCharacteristicTypeLabel(String(type));
  return labels[parsed] ?? String(type).toLowerCase();
}

function slugToken(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function materialPrefix(materialName: string): string {
  const letters = materialName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .join('')
    .toUpperCase();
  if (letters.length <= 5) return letters;
  return letters.slice(0, 5);
}

export function detectColorFromName(materialName: string): string | null {
  const lower = materialName.toLowerCase();
  for (const c of COLOR_WORDS) {
    if (lower.includes(c)) return c.toUpperCase();
  }
  return null;
}

export type MainReferenceInput = {
  materialName: string;
  characteristicType: CharacteristicType | string;
  value?: string | null;
  color?: string | null;
  /** 2e caractéristique (détail autre, finition…) */
  secondDetail?: string | null;
};

/** Stocke la référence importée/saisie sans la recalculer */
export function storeMainReference(ref: string): string {
  return ref
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** XXXXX-VALEUR-COULEUR — référence métier courte */
export function generateMainReference(input: MainReferenceInput): string {
  const name = input.materialName.trim();
  const prefix = materialPrefix(name);
  const value = (input.value ?? '').trim();
  const color = (input.color ?? detectColorFromName(name) ?? '').trim();
  const type = parseCharacteristicTypeLabel(String(input.characteristicType));

  if (!value) {
    const typeSlug = slugToken(characteristicTypeLabel(type));
    return prefix ? `${prefix}-${typeSlug}` : typeSlug;
  }

  const valueSlug = slugToken(value);
  let ref = prefix ? `${prefix}-${valueSlug}` : valueSlug;
  const second = (input.secondDetail ?? '').trim();
  if (second) {
    const secondSlug = slugToken(second);
    if (secondSlug && !ref.includes(secondSlug)) ref = `${ref}-${secondSlug}`;
  }
  if (color) {
    const colorSlug = slugToken(color);
    if (colorSlug && !ref.includes(colorSlug)) ref = `${ref}-${colorSlug}`;
  }
  return ref;
}

export function formatExcelRowId(n: number): string {
  return String(Math.max(1, n)).padStart(3, '0');
}

/** ID Excel simple (001) ou null si ID technique cuid */
export function parseExcelIdColumn(raw: unknown): { excelRowId?: string; technicalId?: string } {
  const t = String(raw ?? '').trim();
  if (!t) return {};
  if (/^cm[a-z0-9]{10,}$/i.test(t)) return { technicalId: t };
  if (/^\d{1,6}$/.test(t)) return { excelRowId: formatExcelRowId(parseInt(t, 10)) };
  if (/^0*\d{1,6}$/.test(t)) return { excelRowId: formatExcelRowId(parseInt(t, 10)) };
  return { excelRowId: t };
}

export function isTechnicalDbId(id: string): boolean {
  return /^cm[a-z0-9]{10,}$/i.test(id.trim());
}

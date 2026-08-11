/**
 * Catalogue Articles 2026 — prix imprimés exacts (280 variantes commerciales).
 * Source : docs/references/catalogue-articles-prix-imprimes-exacts-2026.xlsx
 *
 * Règle ORION :
 * - Ces lignes = VARIANTES DE PRIX rattachées aux ~95 parents POS (jamais des cartes catalogue).
 * - Matières de base (papiers, bâches, vinyles, plaques brutes) restent dans Catalogue 2026 Matières.
 */

import * as XLSX from 'xlsx';
import path from 'node:path';
import fs from 'node:fs';
import { normalizeDirectSaleCategory } from '@/lib/direct-sale/categories';
import {
  artVariantArchiveLabel,
  resolveArticle2026CanonicalPosId,
} from '@/lib/pos/article-2026-canonical-map';

export {
  FINISHED_PRODUCT_AS_MATERIAL_RE,
  isBaseSubstrateMaterial,
  isFinishedProductMisplacedAsMaterial,
} from '@/lib/backoffice/material-vs-article';

export const CATALOGUE_ARTICLES_2026_SHEET = 'Articles';

export const CATALOGUE_ARTICLES_2026_REFERENCE_PATH = path.join(
  process.cwd(),
  'docs/references/catalogue-articles-prix-imprimes-exacts-2026.xlsx',
);

export type CatalogueArticle2026Row = {
  ref: string;
  family: string;
  article: string;
  variant: string;
  format: string;
  color: string;
  face: string;
  qtyRef: string;
  unit: string;
  unitPrice: number;
  source: string;
};

export type CatalogueArticles2026Workbook = {
  articles: CatalogueArticle2026Row[];
  byFamily: Record<string, number>;
};

/** Famille Excel → catégorie DirectSale / POS */
const FAMILY_TO_CATEGORY: Record<string, string> = {
  flyers: 'flyers',
  cartes: 'carterie',
  'plaques & signalétique': 'plv',
  'plaques & signaletique': 'plv',
  textiles: 'textile',
  goodies: 'goodies',
  'plv & événementiel': 'plv',
  'plv & evenementiel': 'plv',
  photo: 'photo',
  calendriers: 'calendrier',
  'documents imprimés': 'notes',
  'documents imprimes': 'notes',
  'documents administratifs': 'documents',
  'articles personnalisés': 'packaging',
  'articles personnalises': 'packaging',
};

function pick(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function num(val: unknown): number | null {
  if (val == null || val === '') return null;
  const n = Number(String(val).replace(/\s/g, '').replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function sheetMatrixToRows(sheet: XLSX.WorkSheet, headerRowIndex: number): Record<string, unknown>[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (!matrix.length) return [];
  const headers = ((matrix[headerRowIndex] ?? []) as unknown[]).map((h, idx) =>
    String(h ?? '').trim() || `__col_${idx}`,
  );
  const out: Record<string, unknown>[] = [];
  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const cells = (matrix[r] ?? []) as unknown[];
    if (!cells.some((c) => String(c ?? '').trim() !== '')) continue;
    const row: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c]!;
      if (key.startsWith('__col_')) continue;
      row[key] = cells[c] ?? '';
    }
    out.push(row);
  }
  return out;
}

function findHeaderRowByFirstColumn(matrix: unknown[][], firstCol: RegExp): number {
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const first = String(((matrix[i] ?? []) as unknown[])[0] ?? '').trim();
    if (firstCol.test(first)) return i;
  }
  return 0;
}

export function parseCatalogueArticles2026Buffer(buf: Buffer | ArrayBuffer): CatalogueArticles2026Workbook {
  const wb = XLSX.read(buf, { type: buf instanceof ArrayBuffer ? 'array' : 'buffer' });
  const sheet =
    wb.Sheets[CATALOGUE_ARTICLES_2026_SHEET]
    ?? wb.Sheets[wb.SheetNames[0] ?? ''];
  if (!sheet) return { articles: [], byFamily: {} };

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const headerIdx = findHeaderRowByFirstColumn(matrix, /^Réf\.?$/i);
  const rawRows = sheetMatrixToRows(sheet, headerIdx);

  const articles: CatalogueArticle2026Row[] = rawRows
    .map((raw) => {
      const ref = pick(raw, 'Réf.', 'Ref', 'REF', 'ID');
      if (!ref) return null;
      const unitPrice = num(raw['Prix imprimé exact (Ar)'] ?? raw.PRIX ?? raw.Prix);
      if (unitPrice == null || unitPrice <= 0) return null;
      return {
        ref,
        family: pick(raw, 'Famille', 'FAMILLE'),
        article: pick(raw, 'Article', 'ARTICLE'),
        variant: pick(raw, 'Variante / caractéristique', 'Variante', 'Caractéristique'),
        format: pick(raw, 'Format / dimensions', 'Format', 'FORMAT'),
        color: pick(raw, 'Couleur / aspect', 'Couleur'),
        face: pick(raw, 'Face / impression comprise', 'Face', 'Impression'),
        qtyRef: pick(raw, 'Quantité de référence', 'Quantité'),
        unit: pick(raw, 'Unité', 'UNITE') || 'pièce',
        unitPrice,
        source: pick(raw, 'Source exacte', 'Source'),
      } satisfies CatalogueArticle2026Row;
    })
    .filter((r): r is CatalogueArticle2026Row => r != null && Boolean(r.article));

  const byFamily: Record<string, number> = {};
  for (const a of articles) {
    byFamily[a.family || '?'] = (byFamily[a.family || '?'] ?? 0) + 1;
  }

  return { articles, byFamily };
}

export function loadCatalogueArticles2026FromPath(
  filePath = CATALOGUE_ARTICLES_2026_REFERENCE_PATH,
): CatalogueArticles2026Workbook {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Référentiel Articles 2026 introuvable : ${filePath}`);
  }
  return parseCatalogueArticles2026Buffer(fs.readFileSync(filePath));
}

let cached: CatalogueArticles2026Workbook | null = null;

export function getCatalogueArticles2026Workbook(forceReload = false): CatalogueArticles2026Workbook {
  if (!cached || forceReload) {
    cached = loadCatalogueArticles2026FromPath();
  }
  return cached;
}

export function mapFamilyToCategory(family: string, articleName: string, ref: string): string {
  const key = family
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const fromFamily = FAMILY_TO_CATEGORY[key];
  if (fromFamily) return fromFamily;
  return normalizeDirectSaleCategory({ category: family, name: articleName, reference: ref }).categoryId;
}

/** Mappe une ligne Excel → article POS canonique (toujours défini). */
export function resolveCanonicalPosId(row: CatalogueArticle2026Row): string {
  return resolveArticle2026CanonicalPosId(row);
}

/**
 * Convertit une ligne Articles 2026 → import Prix articles.
 * Variante ART = lookup prix (visiblePOS=non) rattachée au parent — pas une carte catalogue.
 */
export function catalogueArticle2026ToPrixArticlesRow(
  row: CatalogueArticle2026Row,
): Record<string, unknown> {
  const category = mapFamilyToCategory(row.family, row.article, row.ref);
  const chars = [row.variant, row.format, row.color, row.face, row.qtyRef]
    .filter(Boolean)
    .join(' · ');
  const canonicalId = resolveCanonicalPosId(row);
  const displayName = artVariantArchiveLabel(
    canonicalId,
    [row.article, row.variant, row.format].filter(Boolean).join(' — '),
  );

  return {
    ID: row.ref,
    ARTICLE: displayName,
    MATIERE: row.variant || '',
    TYPE: `${category} / ${row.family}`,
    CARACTERISTIQUES: chars,
    'PRIX VIERGE': '',
    'MARGE GAIN (Ar)': '',
    'PRIX AVEC IMPRESSION': row.unitPrice,
    STOCK: '',
    'VISIBLE POS': 'non',
    STATUT: 'archived',
    _canonicalPosId: canonicalId,
    _unit: row.unit,
    _source: row.source,
    _qtyRef: row.qtyRef,
    _format: row.format,
    _face: row.face,
    _family: row.family,
    _reference: canonicalId,
  };
}

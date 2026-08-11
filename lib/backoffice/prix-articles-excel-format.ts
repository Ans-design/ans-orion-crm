/**
 * Excel — module Admin « Prix articles » (stylo, casquette, CV…).
 * - Feuille « Fiches parents » : colonnes importables (round-trip).
 * - Feuille « Catalogue aperçu » : miroir du tableau UI (variantes + grilles + coûts MG).
 */
import { formatExcelRowId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';
import { resolveIndicativeUnitCostAr } from '@/lib/backoffice/madagascar-article-cost-benchmarks';
import {
  normalizeDirectSaleCategory,
  normalizeDirectSaleStatus,
  parseBoolExcel,
  slugifyDirectSaleName,
} from '@/lib/direct-sale/categories';
import {
  artVariantArchiveLabel,
  resolveArticle2026CanonicalPosId,
} from '@/lib/pos/article-2026-canonical-map';
import {
  formatPrix2026AdminPriceRange,
  getPrix2026AdminPriceDisplay,
  resolvePrix2026AdminArticleId,
} from '@/lib/data/prix-2026-grids';

/** Colonnes importables (fiche parent DB) — ne pas casser le round-trip. */
export const PRIX_ARTICLES_EXCEL_COLUMNS = [
  'ID',
  'REFERENCE',
  'ARTICLE',
  'MATIERE',
  'TYPE',
  'CARACTERISTIQUES',
  'PRIX VIERGE',
  'MARGE GAIN (Ar)',
  'PRIX AVEC IMPRESSION',
  'STOCK',
  'VISIBLE POS',
  'STATUT',
] as const;

export type PrixArticlesExcelColumn = (typeof PRIX_ARTICLES_EXCEL_COLUMNS)[number];

/**
 * Colonnes miroir du catalogue à l’écran (AnsArticlesChrome) + coûts Madagascar.
 * Feuille lecture / analyse — pas utilisée pour l’import upsert.
 */
export const PRIX_ARTICLES_CATALOGUE_EXPORT_COLUMNS = [
  'CODE',
  'ARTICLE',
  'FAMILLE',
  'TYPE',
  'LIGNE',
  'SOURCE PRIX',
  'MATIERE',
  'COULEUR',
  'TAILLE',
  'FORMAT',
  'FACE',
  'CARACTERISTIQUES',
  'DESCRIPTION',
  'UNITE',
  'QTE MIN',
  'QTE MAX',
  'PRIX VIERGE (Ar)',
  'MARGE GAIN (Ar)',
  'PRIX IMPRIME (Ar)',
  'PRIX GRILLE MIN (Ar)',
  'PRIX GRILLE MAX (Ar)',
  'PRIX GRILLE AFFICHE',
  'FEUILLE PRIX 2026',
  'COUT INDICATIF (Ar)',
  'COUT MG MIN (Ar)',
  'COUT MG MAX (Ar)',
  'SOURCE COUT',
  'NOTE COUT MG',
  'STOCK',
  'DISPO',
  'VISIBLE POS',
  'STATUT',
] as const;

export type PrixArticlesCatalogueExcelColumn =
  (typeof PRIX_ARTICLES_CATALOGUE_EXPORT_COLUMNS)[number];

export const PRIX_ARTICLES_BENCHMARKS_EXPORT_COLUMNS = [
  'FAMILLE',
  'LIBELLE',
  'COUT MIN (Ar)',
  'COUT MAX (Ar)',
  'VENTE DES (Ar)',
  'UNITE',
  'NOTE',
] as const;

function pick(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = raw[k] ?? raw[k.toUpperCase()] ?? raw[k.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function num(raw: string): number | null {
  if (!raw) return null;
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function characteristicsFromArticle(a: {
  defaultColor?: string | null;
  defaultSize?: string | null;
  defaultFormat?: string | null;
  defaultPrintFace?: string | null;
}): string {
  return [a.defaultColor, a.defaultSize, a.defaultFormat, a.defaultPrintFace]
    .map((x) => String(x ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}

/** Marge gain en Ariary = prix impression − prix vierge. */
export function marginGainFromArticle(a: {
  blankUnitPrice?: number | null;
  unitPrice: number;
}): number | null {
  if (a.blankUnitPrice == null) {
    return a.unitPrice > 0 ? Math.round(a.unitPrice) : null;
  }
  return Math.max(0, Math.round(a.unitPrice - a.blankUnitPrice));
}

export function computePrintPriceFromGain(
  blank: number | null,
  marginGain: number | null,
  fallback: number,
): number {
  if (marginGain != null && Number.isFinite(marginGain)) {
    if (blank != null && blank >= 0) return Math.round(blank + marginGain);
    return Math.round(marginGain);
  }
  return fallback;
}

/** Compat legacy — stocke un % dérivé si besoin côté DB. */
export function deriveMarginPercent(blank: number | null, unitPrice: number): number | null {
  if (blank == null || blank <= 0) return null;
  return Math.round(((unitPrice - blank) / blank) * 10000) / 100;
}

export function prixArticleToExcelRow(a: {
  excelId?: string | null;
  id: string;
  name: string;
  materialName?: string | null;
  materialKey?: string | null;
  category: string;
  subCategory?: string | null;
  defaultColor?: string | null;
  defaultSize?: string | null;
  defaultFormat?: string | null;
  defaultPrintFace?: string | null;
  blankUnitPrice?: number | null;
  unitPrice: number;
  stockQty?: number | null;
  visiblePOS?: boolean;
  status: string;
  reference?: string | null;
}): Record<(typeof PRIX_ARTICLES_EXCEL_COLUMNS)[number], string | number> {
  const typeLabel = [a.category, a.subCategory].filter(Boolean).join(' / ');
  const gain = marginGainFromArticle(a);
  const idRaw = a.excelId?.trim();
  const idExport = idRaw
    ? (/^\d+$/.test(idRaw) ? formatExcelRowId(parseInt(idRaw, 10)) : idRaw)
    : (a.reference?.trim() || a.id);
  return {
    ID: idExport,
    REFERENCE: a.reference?.trim() || '',
    ARTICLE: a.name,
    MATIERE: a.materialName || a.materialKey || '',
    TYPE: typeLabel,
    CARACTERISTIQUES: characteristicsFromArticle(a),
    'PRIX VIERGE': a.blankUnitPrice ?? '',
    'MARGE GAIN (Ar)': gain ?? '',
    'PRIX AVEC IMPRESSION': a.unitPrice,
    STOCK: a.stockQty ?? '',
    'VISIBLE POS': a.visiblePOS === false ? 'non' : 'oui',
    STATUT: a.status,
  };
}

function stockDispoLabel(stockQty: number | null | undefined): string {
  if (stockQty == null) return 'Sur commande';
  if (stockQty <= 0) return 'Rupture';
  if (stockQty < 10) return 'Stock faible';
  return 'Disponible';
}

/** Miroir d’une ligne catalogue (parent ou variante) pour Excel. */
export function prixArticleDisplayToCatalogueExcelRow(a: {
  excelId?: string | null;
  id: string;
  name: string;
  materialName?: string | null;
  materialKey?: string | null;
  category: string;
  subCategory?: string | null;
  defaultColor?: string | null;
  defaultSize?: string | null;
  defaultFormat?: string | null;
  defaultPrintFace?: string | null;
  blankUnitPrice?: number | null;
  unitPrice: number;
  stockQty?: number | null;
  visiblePOS?: boolean;
  status: string;
  reference?: string | null;
  description?: string | null;
  unit?: string | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  isVariantLine?: boolean;
  variantKey?: string | null;
  priceSourceLabel?: string | null;
}): Record<PrixArticlesCatalogueExcelColumn, string | number> {
  const typeLabel = [a.category, a.subCategory].filter(Boolean).join(' / ');
  const gain = marginGainFromArticle(a);
  const code =
    a.reference?.trim()
    || a.excelId?.trim()
    || (a.isVariantLine ? a.variantKey : null)
    || a.id.slice(0, 16);

  const posArticleId = resolvePrix2026AdminArticleId({
    id: String(a.reference ?? a.excelId ?? a.id).replace(/^pos-catalog:/, ''),
    reference: a.reference,
    excelId: a.excelId,
  });
  const prix2026 = a.isVariantLine ? null : getPrix2026AdminPriceDisplay(posArticleId);
  const usesGrid = prix2026?.kind === 'grid';
  const printed =
    a.isVariantLine
      ? a.unitPrice
      : usesGrid
        ? ''
        : a.unitPrice > 0
          ? a.unitPrice
          : '';

  const cost = resolveIndicativeUnitCostAr({
    blankUnitPrice: a.blankUnitPrice,
    category: a.category,
    name: a.name,
  });

  return {
    CODE: code,
    ARTICLE: a.name,
    FAMILLE: String(a.category || '').replace(/_/g, ' '),
    TYPE: typeLabel,
    LIGNE: a.isVariantLine ? 'Variante' : a.id.startsWith('pos-catalog:') ? 'Catalogue POS' : 'Fiche',
    'SOURCE PRIX':
      a.priceSourceLabel
      || (usesGrid ? `Grille ${prix2026?.sheet ?? 'PRIX 2026'}` : '')
      || (prix2026?.kind === 'entry' ? 'Prix d’entrée PRIX 2026' : '')
      || '',
    MATIERE: a.materialName || a.materialKey || '',
    COULEUR: a.defaultColor ?? '',
    TAILLE: a.defaultSize ?? '',
    FORMAT: a.defaultFormat ?? '',
    FACE: a.defaultPrintFace ?? '',
    CARACTERISTIQUES: characteristicsFromArticle(a),
    DESCRIPTION: a.description ?? '',
    UNITE: a.unit ?? 'pièce',
    'QTE MIN': a.minQuantity ?? 1,
    'QTE MAX': a.maxQuantity ?? '',
    'PRIX VIERGE (Ar)': a.blankUnitPrice ?? '',
    'MARGE GAIN (Ar)': !a.isVariantLine && !usesGrid ? (gain ?? '') : '',
    'PRIX IMPRIME (Ar)': printed,
    'PRIX GRILLE MIN (Ar)': usesGrid ? prix2026!.min : '',
    'PRIX GRILLE MAX (Ar)': usesGrid ? prix2026!.max : '',
    'PRIX GRILLE AFFICHE':
      usesGrid
        ? formatPrix2026AdminPriceRange(prix2026!.min, prix2026!.max)
        : '',
    'FEUILLE PRIX 2026': prix2026?.sheet ?? '',
    'COUT INDICATIF (Ar)': cost.costAr ?? '',
    'COUT MG MIN (Ar)': cost.costMinAr ?? '',
    'COUT MG MAX (Ar)': cost.costMaxAr ?? '',
    'SOURCE COUT': cost.source,
    'NOTE COUT MG': cost.note,
    STOCK: a.stockQty ?? '',
    DISPO: stockDispoLabel(a.stockQty),
    'VISIBLE POS': a.visiblePOS === false ? 'non' : 'oui',
    STATUT: a.status,
  };
}

export function parsePrixArticlesExcelRow(raw: Record<string, unknown>, line: number) {
  // Format Catalogue Articles 2026 (Réf. / Famille / Article / Prix imprimé exact)
  const artRef = pick(raw, 'Réf.', 'Ref', 'REF');
  const artName = pick(raw, 'Article', 'ARTICLE', 'article', 'name');
  const artPrice = num(
    pick(
      raw,
      'Prix imprimé exact (Ar)',
      'PRIX IMPRIMÉ EXACT (AR)',
      'Prix imprimé exact',
      'PRIX AVEC IMPRESSION',
      'prix avec impression',
      'PRIX UNITAIRE',
      'prix unitaire',
      'PRIX',
    ),
  );
  const isArticles2026Format = Boolean(artRef && /^ART-/i.test(artRef) && artName);

  if (isArticles2026Format) {
    const family = pick(raw, 'Famille', 'FAMILLE');
    const variant = pick(raw, 'Variante / caractéristique', 'Variante', 'Caractéristique');
    const format = pick(raw, 'Format / dimensions', 'Format', 'FORMAT');
    const color = pick(raw, 'Couleur / aspect', 'Couleur');
    const face = pick(raw, 'Face / impression comprise', 'Face');
    const qtyRef = pick(raw, 'Quantité de référence', 'Quantité');
    const { resolveArticle2026CanonicalPosId, artVariantArchiveLabel } = require('@/lib/pos/article-2026-canonical-map') as typeof import('@/lib/pos/article-2026-canonical-map');
    const canonicalId = resolveArticle2026CanonicalPosId({
      ref: artRef,
      family,
      article: artName,
      variant,
      format,
      unitPrice: artPrice ?? 0,
    });
    const displayName = artVariantArchiveLabel(
      canonicalId,
      [artName, variant, format].filter(Boolean).join(' — '),
    );
    const chars = [variant, format, color, face, qtyRef].filter(Boolean).join(' · ');
    const typeRaw = family || pick(raw, 'TYPE', 'type', 'CATÉGORIE', 'categorie');
    const { categoryId, categoryLabel } = normalizeDirectSaleCategory({
      category: typeRaw,
      name: artName,
      reference: canonicalId,
    });
    const unitPrice = artPrice ?? 0;
    return {
      row: {
        excelId: artRef,
        name: displayName || artName,
        slug: slugifyDirectSaleName(displayName || artName),
        category: categoryId,
        subCategory: categoryLabel !== categoryId ? family || null : null,
        materialName: variant || null,
        materialKey: null as string | null,
        defaultColor: chars || null,
        blankUnitPrice: null as number | null,
        marginPercent: null as number | null,
        unitPrice,
        visiblePOS: false,
        status: normalizeDirectSaleStatus('archived'),
        stockHint: '',
        marginGainAr: unitPrice > 0 ? unitPrice : null,
        reference: canonicalId,
      },
    };
  }

  const name = artName;
  if (!name) return { error: `Ligne ${line} : ARTICLE requis` as const };

  const excelIdRaw = pick(raw, 'ID', 'id') || artRef;
  const parsedId = parseExcelIdColumn(excelIdRaw);
  const blank = num(pick(raw, 'PRIX VIERGE', 'prix vierge', 'PRIX ARTICLE VIERGE'));
  const marginGain = num(
    pick(
      raw,
      'MARGE GAIN (Ar)',
      'marge gain (ar)',
      'MARGE GAIN',
      'marge gain',
      'GAIN MARGE',
      'gain marge',
    ),
  );
  const legacyMarginPct = num(pick(raw, 'MARGE %', 'marge %', 'MARGE', 'marge'));
  const printPrice = artPrice;
  const chars = pick(raw, 'CARACTERISTIQUES', 'caracteristiques', 'caractéristiques');
  const typeRaw = pick(raw, 'TYPE', 'type', 'CATÉGORIE', 'categorie', 'Famille', 'FAMILLE');
  const [catPart, subPart] = typeRaw.split('/').map((s) => s.trim());
  const { categoryId } = normalizeDirectSaleCategory({
    category: catPart || typeRaw,
    name,
    reference: excelIdRaw,
  });

  let unitPrice = printPrice ?? 0;
  let resolvedGain = marginGain;

  if (resolvedGain == null && legacyMarginPct != null && blank != null) {
    unitPrice = Math.round(blank * (1 + legacyMarginPct / 100));
    resolvedGain = Math.max(0, unitPrice - blank);
  } else if (resolvedGain != null && blank != null) {
    unitPrice = Math.round(blank + resolvedGain);
  } else if (printPrice != null && blank != null) {
    resolvedGain = Math.max(0, printPrice - blank);
    unitPrice = printPrice;
  }

  const marginPercent = deriveMarginPercent(blank, unitPrice);

  return {
    row: {
      excelId: parsedId.excelRowId ?? parsedId.technicalId ?? (excelIdRaw || null),
      name,
      slug: slugifyDirectSaleName(name),
      category: categoryId || catPart || 'petit_format',
      subCategory: subPart || null,
      materialName: pick(raw, 'MATIERE', 'matiere', 'MATIÈRE', 'matière') || null,
      materialKey: pick(raw, 'MATIERE KEY', 'materialKey') || null,
      defaultColor: chars || null,
      blankUnitPrice: blank,
      marginPercent,
      unitPrice,
      visiblePOS: parseBoolExcel(pick(raw, 'VISIBLE POS', 'visible pos') || 'oui'),
      status: normalizeDirectSaleStatus(pick(raw, 'STATUT', 'statut') || 'draft'),
      stockHint: pick(raw, 'STOCK', 'stock'),
      marginGainAr: resolvedGain,
      reference: (() => {
        const meta = String(raw._reference ?? '').trim();
        if (meta) return meta;
        const col = pick(raw, 'REFERENCE', 'reference', 'REF PARENT');
        return col || null;
      })(),
    },
  };
}

export function validatePrixArticlesExcelRows(rows: Record<string, unknown>[]): {
  ok: boolean;
  materialColumn?: string;
  message?: string;
} {
  if (!rows.length) {
    return { ok: false, message: 'Fichier vide ou sans données après la ligne d\'en-têtes.' };
  }
  const sample = rows[0] ?? {};
  const keys = Object.keys(sample).join('|').toLowerCase();
  const looksLikeArticles =
    /article|mati[eè]re|prix|id|r[eé]f/i.test(keys)
    || rows.some((r) =>
      Boolean(
        r.ARTICLE
        || r.Article
        || r['PRIX AVEC IMPRESSION']
        || r['Prix imprimé exact (Ar)']
        || r['Réf.']
        || r.ID
        || r.id,
      ),
    );
  if (!looksLikeArticles) {
    return {
      ok: false,
      message:
        'Colonnes non reconnues — exportez d’abord depuis Prix articles (ou utilisez le fichier Catalogue Articles 2026).',
    };
  }
  return { ok: true, materialColumn: 'ARTICLE' };
}

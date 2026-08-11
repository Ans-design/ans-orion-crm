/**
 * Expansion Prix articles — une ligne par variante matière (CV PCB, PVC…)
 * + complétion des parents POS manquants depuis le catalogue.
 */

import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import { listCarteVisiteEntryPriceRows } from '@/lib/data/carte-visite-prix-2026';
import { resolvePosCatalogEntryPrice } from '@/lib/pos/pos-catalog-entry-price';
import { getDefaultDoypackBlanks } from '@/lib/packaging/doypack-price';
import { getDefaultCupBlanks } from '@/lib/packaging/custom-cup-price';
import { getStampFormatsRuntime } from '@/lib/pricing/stamp-pricing';
import { isCarteriePrix2026Article } from '@/lib/data/prix-2026-grids/carte-visite';

export type PrixArticleBaseRow = {
  id: string;
  excelId: string | null;
  name: string;
  category: string;
  subCategory: string | null;
  reference?: string | null;
  description?: string | null;
  unit?: string | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  materialKey: string | null;
  materialName: string | null;
  defaultColor: string | null;
  defaultSize: string | null;
  defaultFormat: string | null;
  defaultPrintFace: string | null;
  blankUnitPrice: number | null;
  marginPercent: number | null;
  unitPrice: number;
  visiblePOS: boolean;
  status: string;
  stockQty?: number | null;
};

export type PrixArticleDisplayRow = PrixArticleBaseRow & {
  /** Ligne variante grille / blank — prix lecture seule */
  isVariantLine?: boolean;
  /** ID parent pour actions publish/sync/archive */
  actionId?: string;
  variantKey?: string;
  priceSourceLabel?: string | null;
};

function posRef(row: PrixArticleBaseRow): string {
  return String(row.reference ?? row.excelId ?? row.id).trim();
}

function cloneAsVariant(
  parent: PrixArticleBaseRow,
  opts: {
    suffix: string;
    materialName: string;
    unitPrice: number;
    blankUnitPrice?: number | null;
    variantKey: string;
    priceSourceLabel: string;
    defaultFormat?: string | null;
    defaultSize?: string | null;
    defaultPrintFace?: string | null;
  },
): PrixArticleDisplayRow {
  return {
    ...parent,
    id: `${parent.id}::${opts.variantKey}`,
    name: `${parent.name} — ${opts.suffix}`,
    materialName: opts.materialName,
    materialKey: opts.variantKey,
    unitPrice: opts.unitPrice,
    blankUnitPrice: opts.blankUnitPrice ?? null,
    marginPercent: null,
    defaultFormat: opts.defaultFormat ?? parent.defaultFormat,
    defaultSize: opts.defaultSize ?? parent.defaultSize,
    defaultPrintFace: opts.defaultPrintFace ?? parent.defaultPrintFace,
    isVariantLine: true,
    actionId: parent.id.startsWith('pos-catalog:') ? undefined : parent.id,
    variantKey: opts.variantKey,
    priceSourceLabel: opts.priceSourceLabel,
  };
}

function expandCarterie(parent: PrixArticleBaseRow): PrixArticleDisplayRow[] {
  return listCarteVisiteEntryPriceRows().map((v) =>
    cloneAsVariant(parent, {
      suffix: v.label,
      materialName: v.label,
      unitPrice: v.unitPrice,
      variantKey: v.column,
      priceSourceLabel: `Grille CV recto ×${v.qtyMin}`,
      defaultPrintFace: 'Recto',
    }),
  );
}

function expandDoypack(parent: PrixArticleBaseRow): PrixArticleDisplayRow[] {
  return getDefaultDoypackBlanks().map((b, i) =>
    cloneAsVariant(parent, {
      suffix: `${b.matiere} ${b.formatLabel}`,
      materialName: b.matiere,
      unitPrice: b.prixViergeHt,
      blankUnitPrice: b.prixViergeHt,
      variantKey: `doy-${i}-${b.matiere}-${b.formatLabel}`.replace(/\s+/g, '-').toLowerCase(),
      priceSourceLabel: 'Vierge doypack',
      defaultFormat: b.formatLabel,
      defaultSize: b.contenance ?? null,
    }),
  );
}

function expandGobelet(parent: PrixArticleBaseRow): PrixArticleDisplayRow[] {
  return getDefaultCupBlanks().map((b, i) =>
    cloneAsVariant(parent, {
      suffix: `${b.typeGobelet}${b.contenance ? ` ${b.contenance}` : ''}`,
      materialName: b.matiere ?? b.typeGobelet,
      unitPrice: b.prixViergeHt,
      blankUnitPrice: b.prixViergeHt,
      variantKey: `cup-${i}-${b.typeGobelet}`.replace(/\s+/g, '-').toLowerCase(),
      priceSourceLabel: 'Vierge gobelet',
      defaultSize: b.contenance ?? null,
    }),
  );
}

function expandStamp(parent: PrixArticleBaseRow): PrixArticleDisplayRow[] {
  return getStampFormatsRuntime()
    .filter((f) => f.active !== false && f.status !== 'archived')
    .map((f, i) =>
      cloneAsVariant(parent, {
        suffix: `${f.stampType} ${f.formatLabel}`,
        materialName: f.stampType,
        unitPrice: f.unitPrice,
        variantKey: f.reference ?? `tamp-${i}-${f.formatLabel}`.replace(/\s+/g, '-').toLowerCase(),
        priceSourceLabel: 'Format tampon',
        defaultFormat: f.formatLabel,
        defaultSize: `${f.widthMm}×${f.heightMm} mm`,
      }),
    );
}

/** Complète la liste DB avec les parents POS manquants (prix d’entrée). */
export function mergeMissingPosParents(rows: PrixArticleBaseRow[]): PrixArticleBaseRow[] {
  const byRef = new Set<string>();
  for (const r of rows) {
    byRef.add(posRef(r));
    byRef.add(r.id);
    if (r.reference) byRef.add(r.reference);
    if (r.excelId) byRef.add(r.excelId);
  }

  const extras: PrixArticleBaseRow[] = [];
  for (const item of POS_CATALOGUE) {
    if (byRef.has(item.id)) continue;
    const entry = resolvePosCatalogEntryPrice(item.id);
    extras.push({
      id: `pos-catalog:${item.id}`,
      excelId: item.id,
      name: item.name,
      category: item.category,
      subCategory: null,
      reference: item.id,
      materialKey: null,
      materialName: null,
      defaultColor: null,
      defaultSize: null,
      defaultFormat: null,
      defaultPrintFace: null,
      blankUnitPrice: null,
      marginPercent: null,
      unitPrice: entry ?? 0,
      visiblePOS: true,
      status: entry != null && entry > 0 ? 'published' : 'draft',
      stockQty: null,
    });
  }
  return [...rows, ...extras];
}

/**
 * Étend parents carterie / packaging / tampon en lignes matière × prix.
 * Les autres parents restent une ligne (avec prix d’entrée injecté si 0).
 */
export function expandPrixArticleVariantRows(rows: PrixArticleBaseRow[]): PrixArticleDisplayRow[] {
  const out: PrixArticleDisplayRow[] = [];

  for (const row of rows) {
    const ref = posRef(row);
    const catalogId = ref.startsWith('pos-catalog:') ? ref.slice('pos-catalog:'.length) : ref;

    // Injecte prix d’entrée si la fiche parent n’en a pas
    const entry = resolvePosCatalogEntryPrice(catalogId);
    const withPrice: PrixArticleBaseRow =
      row.unitPrice > 0
        ? row
        : entry != null && entry > 0
          ? { ...row, unitPrice: entry }
          : row;

    if (isCarteriePrix2026Article(catalogId) || isCarteriePrix2026Article(row.id)) {
      const variants = expandCarterie(withPrice);
      if (variants.length) {
        out.push(...variants);
        continue;
      }
    }

    if (catalogId === 'pkg-doypack' || /doypack/i.test(row.name)) {
      const variants = expandDoypack(withPrice);
      if (variants.length) {
        out.push(...variants);
        continue;
      }
    }

    if (catalogId === 'pkg-gobelet' || /gobelet/i.test(row.name)) {
      const variants = expandGobelet(withPrice);
      if (variants.length) {
        out.push(...variants);
        continue;
      }
    }

    if (catalogId === 'doc-tampon' || /^tampon/i.test(row.name)) {
      const variants = expandStamp(withPrice);
      if (variants.length) {
        out.push(...variants);
        continue;
      }
    }

    out.push({
      ...withPrice,
      actionId: row.id.startsWith('pos-catalog:') ? undefined : row.id,
      priceSourceLabel: entry != null && row.unitPrice <= 0 ? 'Prix d’entrée POS' : null,
    });
  }

  return out;
}

import { isCatalogue2026SansTarif } from '@/lib/backoffice/catalogue-2026-excel-format';
import type { MaterialDto } from './base-material.dto';
import type { UnifiedMaterialPriceRow } from './base-material-price-unified.service';

export type MaterialPriceAnomalyLevel = 'info' | 'warning' | 'critique';

export type MaterialPriceAnomaly = {
  code: string;
  level: MaterialPriceAnomalyLevel;
  message: string;
  action?: string;
};

function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Recherche tolérante : "chirable" trouve "indéchirable", "off 80" trouve offset 80g */
export function fuzzyMaterialSearch(haystack: string, query: string): boolean {
  const h = normalizeSearch(haystack);
  const parts = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!parts.length) return true;
  return parts.every((part) => {
    const q = normalizeSearch(part);
    if (!q) return true;
    if (h.includes(q)) return true;
    let i = 0;
    for (const c of q) {
      const idx = h.indexOf(c, i);
      if (idx === -1) return false;
      i = idx + 1;
    }
    return true;
  });
}

export function detectMaterialPriceAnomalies(
  row: MaterialDto & Partial<UnifiedMaterialPriceRow>,
): MaterialPriceAnomaly[] {
  const anomalies: MaterialPriceAnomaly[] = [];
  const rawName = (row.name ?? '').trim();
  if (
    !rawName ||
    rawName === '—' ||
    /^mati[eè]re\s+article$/i.test(rawName) ||
    /^sans\s+nom$/i.test(rawName)
  ) {
    anomalies.push({
      code: 'NAME_MISSING',
      level: 'warning',
      message: 'Nom matière manquant',
      action: 'Compléter le nom',
    });
  }

  let ref2026SansTarif = false;
  try {
    ref2026SansTarif = isCatalogue2026SansTarif(row.excelRowId);
  } catch {
    ref2026SansTarif = false;
  }
  if (ref2026SansTarif) {
    anomalies.push({
      code: 'REF_2026_SANS_TARIF',
      level: 'info',
      message: 'Référencée sans tarif exact Catalogue 2026 — ne pas extrapoler',
      action: 'Saisir prix manuellement ou attendre mise à jour référentiel',
    });
  }

  if (row.basePrintPrice == null) {
    anomalies.push({
      code: 'BASE_PRICE_MISSING',
      level: row.visiblePOS && row.impactsPrice ? 'critique' : 'warning',
      message: ref2026SansTarif
        ? 'Prix base manquant (liste « Sans prix exact » 2026)'
        : 'Prix base sans finition manquant',
      action: ref2026SansTarif ? 'Voir référentiel Catalogue 2026' : 'Saisir prix base',
    });
  }
  if (row.purchasePrice == null) {
    anomalies.push({
      code: 'PURCHASE_MISSING',
      level: 'warning',
      message: 'Prix achat manquant',
    });
  }
  if (
    row.maxPrice != null &&
    row.basePrintPrice != null &&
    row.maxPrice < row.basePrintPrice
  ) {
    anomalies.push({
      code: 'MAX_BELOW_BASE',
      level: 'warning',
      message: 'Prix max inférieur au prix base',
    });
  }
  if (
    row.purchasePrice != null &&
    row.basePrintPrice != null &&
    row.basePrintPrice < row.purchasePrice
  ) {
    anomalies.push({
      code: 'NEGATIVE_MARGIN',
      level: 'warning',
      message: 'Marge négative (base < achat)',
    });
  }
  if (!row.stockItemId) {
    anomalies.push({
      code: 'STOCK_UNLINKED',
      level: row.impactsStock ? 'critique' : 'info',
      message: 'Stock non lié',
      action: 'Lier stock',
    });
  }
  if (!row.unitDisplay && !row.unit) {
    anomalies.push({ code: 'UNIT_MISSING', level: 'warning', message: 'Unité manquante' });
  }
  if (
    row.unitDisplay &&
    row.unitStandard &&
    row.unitDisplay !== row.unitStandard &&
    (row.conversionFactor == null || row.conversionFactor <= 0)
  ) {
    anomalies.push({ code: 'CONVERSION_MISSING', level: 'warning', message: 'Conversion manquante' });
  }
  if (row.visiblePOS && !row.active) {
    anomalies.push({ code: 'POS_INACTIVE', level: 'warning', message: 'Visible POS mais inactive' });
  }
  if (row.impactsStock && !row.stockItemId) {
    anomalies.push({
      code: 'IMPACT_STOCK_NO_LINK',
      level: 'critique',
      message: 'Impact stock ON sans stock lié',
    });
  }
  if (row.impactsPrice && (row.basePrintPrice == null || row.basePrintPrice <= 0)) {
    anomalies.push({
      code: 'IMPACT_PRICE_NO_BASE',
      level: 'critique',
      message: 'Impact prix ON sans prix base',
    });
  }
  if (row.source === 'PRIX_2026' || row.source?.includes('2026')) {
    anomalies.push({
      code: 'PRIX_2026_LEGACY',
      level: 'info',
      message: 'Source PRIX 2026 — archive uniquement',
    });
  }
  if (row.grammage && /mm|µm|micron/i.test(row.grammage)) {
    anomalies.push({
      code: 'GRAMMAGE_UNIT_MISMATCH',
      level: 'warning',
      message: 'Unité incohérente : grammage en mm',
      action: 'Classer en épaisseur',
    });
  }
  if (row.thickness && /g\/m²|g\/m2|g\b|gr\b|gramme/i.test(row.thickness)) {
    anomalies.push({
      code: 'THICKNESS_UNIT_MISMATCH',
      level: 'warning',
      message: 'Unité incohérente : épaisseur en grammage',
      action: 'Classer en grammage',
    });
  }
  if (
    row.grammage &&
    row.thickness &&
    /mm|µm|micron/i.test(row.grammage) &&
    /mm|µm|micron/i.test(row.thickness)
  ) {
    anomalies.push({
      code: 'DUPLICATE_THICKNESS',
      level: 'warning',
      message: 'Épaisseur dupliquée dans grammage et épaisseur',
      action: 'Nettoyer les champs',
    });
  }

  return anomalies;
}

export function materialSearchBlob(row: MaterialDto & Partial<UnifiedMaterialPriceRow>): string {
  return [
    row.name,
    row.materialKey,
    row.family,
    row.grammage,
    row.format,
    row.thickness,
    row.articleName,
    row.stockSku,
    row.stockSupplier,
    row.publicationStatus,
  ]
    .filter(Boolean)
    .join(' ');
}

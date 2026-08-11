import type { MaterialPriceUnifiedRow } from '@/components/backoffice-v2/pricing-custom/material-prices/types';
import { deriveMaterialTableFields } from '@/lib/backoffice/material-table-fields';

export type MaterialMasterRowExtensions = {
  laize: string | null;
  size: string | null;
  color: string | null;
  location: string | null;
  contextPricesSummary: string | null;
  stockDisponible: number | null;
};

const COLOR_RE =
  /\b(blanc|noir|rouge|bleu|vert|jaune|orange|gris|beige|marron|rose|violet|doré|dore|argent|transparent|naturel|kraft)\b/i;

function formatDimensions(
  widthMm: number | null | undefined,
  heightMm: number | null | undefined,
  unit: string | null | undefined,
): string | null {
  if (widthMm == null && heightMm == null) return null;
  const u = unit === 'cm' ? 'cm' : 'mm';
  const w = widthMm != null ? (unit === 'cm' ? widthMm / 10 : widthMm) : null;
  const h = heightMm != null ? (unit === 'cm' ? heightMm / 10 : heightMm) : null;
  if (w != null && h != null) return `${w}×${h} ${u}`;
  if (w != null) return `${w} ${u}`;
  if (h != null) return `${h} ${u}`;
  return null;
}

function parseColor(row: MaterialPriceUnifiedRow, materialName: string): string | null {
  const char = deriveMaterialTableFields(row).mainCharacteristic;
  if (char?.type === 'couleur') return char.displayValue;
  const fromName = materialName.match(COLOR_RE)?.[1];
  if (fromName) return fromName.charAt(0).toUpperCase() + fromName.slice(1).toLowerCase();
  const notes = row.anomalyNotes?.trim();
  if (notes && COLOR_RE.test(notes)) {
    const m = notes.match(COLOR_RE)?.[1];
    if (m) return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
  }
  return null;
}

function buildContextPricesSummary(row: MaterialPriceUnifiedRow): string | null {
  if (row.rowKind === 'article_price' && row.articleName) {
    const price = row.basePrintPrice;
    const priceStr = price != null ? `${Math.round(price).toLocaleString('fr-FR')} Ar` : '—';
    return `${row.articleName} · ${priceStr}`;
  }
  if ((row.linkedArticlesCount ?? 0) > 0) {
    return `${row.linkedArticlesCount} tarif${row.linkedArticlesCount > 1 ? 's' : ''} article`;
  }
  return null;
}

/** Dérive les champs manquants pour la table maîtresse 27 colonnes. */
export function deriveMaterialMasterExtensions(
  row: MaterialPriceUnifiedRow & {
    widthMm?: number | null;
    heightMm?: number | null;
    dimensionUnit?: string | null;
    stockLocation?: string | null;
  },
): MaterialMasterRowExtensions {
  const fields = deriveMaterialTableFields(row);

  let laize: string | null = null;
  if (fields.mainCharacteristic?.type === 'laize') {
    laize = fields.mainCharacteristic.displayValue;
  } else if (row.grammage && /cm\b/i.test(row.grammage)) {
    laize = row.grammage.replace(/\s+/g, '');
  }

  const size =
    fields.mainCharacteristic?.type === 'taille'
      ? fields.mainCharacteristic.displayValue
      : formatDimensions(row.widthMm, row.heightMm, row.dimensionUnit);

  const color = parseColor(row, fields.materialName);

  const locations = [
    row.stockLocation?.trim(),
    (row as { stockSite?: string | null }).stockSite?.trim(),
  ].filter(Boolean) as string[];
  const location = locations.length > 0 ? [...new Set(locations)].join(', ') : null;

  const physical = row.stockPhysical ?? null;
  const reserved = row.stockReserved ?? null;
  let stockDisponible = row.stockAvailable ?? null;
  if (stockDisponible == null && physical != null) {
    stockDisponible = Math.max(0, physical - (reserved ?? 0));
  }

  return {
    laize,
    size,
    color,
    location,
    contextPricesSummary: buildContextPricesSummary(row),
    stockDisponible,
  };
}

export type StockAlertLevel = 'none' | 'ok' | 'warn' | 'critical' | 'negative' | 'missing';

/**
 * Niveau d’alerte vs seuil mini requis.
 * - ok : au-dessus de 125 % du seuil (confortable)
 * - warn : entre seuil et 125 % (proche du mini)
 * - critical : ≤ seuil (sous le stock minimum)
 * - negative / missing : données absentes ou invalides
 */
export function resolveStockAlertLevel(
  disponible: number | null | undefined,
  threshold: number | null | undefined,
): StockAlertLevel {
  if (disponible == null) return 'missing';
  if (disponible < 0) return 'negative';
  if (disponible <= 0) return 'critical';
  if (threshold == null || !(threshold > 0)) return 'ok';
  if (disponible <= threshold) return 'critical';
  if (disponible <= threshold * 1.25) return 'warn';
  return 'ok';
}

/** Remplissage jauge 0–100 % relatif au seuil mini (plein ≈ 3× seuil). */
export function resolveStockGaugePct(
  disponible: number | null | undefined,
  threshold: number | null | undefined,
): number {
  if (disponible == null || disponible < 0) return 0;
  if (disponible === 0) return 0;
  if (threshold != null && threshold > 0) {
    const full = threshold * 3;
    return Math.max(4, Math.min(100, Math.round((disponible / full) * 100)));
  }
  // Sans seuil : jauge indicative (capée).
  return Math.max(8, Math.min(100, Math.round(Math.min(disponible, 100))));
}

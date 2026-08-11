import { formatClientDimensionsCm } from '@/lib/dimensions/grand-format-units';
import { formatClientDimensionsMm } from '@/lib/dimensions/petit-format-units';

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Unité affichée dans les PDF commerciaux (devis, proforma, facture). */
export function inferCommercialLineUnit(
  articleId?: string | null,
  configSnapshot?: unknown,
  fallbackUnite?: string | null,
): string {
  if (fallbackUnite?.trim()) return fallbackUnite.trim();
  const config = asRecord(configSnapshot);
  const id = articleId ?? '';

  if (config.surface_m2 != null || config.surfaceM2 != null || config.surface_facturable_m2 != null) {
    return 'm²';
  }

  if (id.startsWith('gf-') || id === 'gf-bache') {
    const l = Number(config.longueur_cm ?? config.longueur ?? 0);
    const w = Number(config.largeur_cm ?? config.largeur ?? 0);
    if (l > 0 && w > 0) {
      return formatClientDimensionsCm(l, w);
    }
    return 'ex.';
  }

  const lMm = Number(config.longueur_mm ?? config.longueurMm ?? 0);
  const wMm = Number(config.largeur_mm ?? config.largeurMm ?? 0);
  if (lMm > 0 && wMm > 0) {
    return formatClientDimensionsMm(lMm, wMm);
  }

  return 'ex.';
}

export function formatCommercialQtyCell(
  quantity: number,
  articleId?: string | null,
  configSnapshot?: unknown,
  fallbackUnite?: string | null,
): string {
  const qty = Math.max(1, quantity);
  const unit = inferCommercialLineUnit(articleId, configSnapshot, fallbackUnite);
  if (unit.includes('×') || unit.includes('cm') || unit.includes('mm')) {
    return `${qty} ex. (${unit})`;
  }
  if (unit === 'm²') return `${qty} ex. · surface en m²`;
  return `${qty} ${unit}`;
}

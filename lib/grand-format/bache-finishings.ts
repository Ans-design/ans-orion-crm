/**
 * Finitions linéaires bâche (ourlet, fourreau, renfort, raccord).
 * Tarifs Admin GF — défauts ORION, surchargeables via options evaluateBache.
 */

import { DEFAULT_GF_ADMIN_PRICING, getGfAdminPricing } from '@/lib/grand-format/gf-admin-config';

export type BacheLinearFinishingKey = 'ourlet' | 'fourreau' | 'renfort' | 'raccord_soudure';

export type BacheFinishingsSelection = {
  ourlet?: boolean;
  fourreau?: boolean;
  /** Côtés fourreau : haut / bas / les deux (défaut haut). */
  fourreauSides?: 'top' | 'bottom' | 'both';
  renfort?: boolean;
  raccord_soudure?: boolean;
  /** Longueur raccord manuelle (m) si assemblage — sinon 0. */
  raccordMeters?: number;
};

export type BacheFinishingLine = {
  key: BacheLinearFinishingKey;
  label: string;
  meters: number;
  unitPriceAr: number;
  totalAr: number;
};

export type BacheFinishingsRates = {
  ourletPerMlAr: number;
  fourreauPerMlAr: number;
  renfortPerMlAr: number;
  raccordPerMlAr: number;
};

export function ratesFromGfAdmin(): BacheFinishingsRates {
  const p = getGfAdminPricing();
  return {
    ourletPerMlAr: p.ourletPerMlAr,
    fourreauPerMlAr: p.fourreauPerMlAr,
    renfortPerMlAr: p.renfortPerMlAr,
    raccordPerMlAr: p.raccordPerMlAr,
  };
}

export const DEFAULT_BACHE_FINISHING_RATES: BacheFinishingsRates = {
  ourletPerMlAr: DEFAULT_GF_ADMIN_PRICING.ourletPerMlAr,
  fourreauPerMlAr: DEFAULT_GF_ADMIN_PRICING.fourreauPerMlAr,
  renfortPerMlAr: DEFAULT_GF_ADMIN_PRICING.renfortPerMlAr,
  raccordPerMlAr: DEFAULT_GF_ADMIN_PRICING.raccordPerMlAr,
};

const LABELS: Record<BacheLinearFinishingKey, string> = {
  ourlet: 'Ourlet',
  fourreau: 'Fourreau',
  renfort: 'Renfort',
  raccord_soudure: 'Raccord / soudure',
};

function truthy(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return false;
  if (/^(non|no|sans|0|false|off|aucun)/i.test(s)) return false;
  return /oui|yes|avec|1|true|on/i.test(s) || s === 'ourlet' || s === 'fourreau' || s === 'renfort';
}

/** Parse `bache_finitions` objet, CSV, ou flags plats `finition_ourlet`… */
export function parseBacheFinishings(config: Record<string, unknown>): BacheFinishingsSelection {
  const raw = config.bache_finitions ?? config.finitions_bache ?? null;
  const sel: BacheFinishingsSelection = {};

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    sel.ourlet = truthy(o.ourlet);
    sel.fourreau = truthy(o.fourreau);
    sel.renfort = truthy(o.renfort);
    sel.raccord_soudure = truthy(o.raccord_soudure ?? o.raccord);
    const sides = String(o.fourreauSides ?? o.fourreau_sides ?? 'top').toLowerCase();
    if (sides === 'bottom' || sides === 'bas') sel.fourreauSides = 'bottom';
    else if (sides === 'both' || sides === 'deux') sel.fourreauSides = 'both';
    else sel.fourreauSides = 'top';
    const rm = Number(o.raccordMeters ?? o.raccord_meters ?? 0);
    if (Number.isFinite(rm) && rm > 0) sel.raccordMeters = rm;
  } else if (Array.isArray(raw)) {
    const set = new Set(raw.map((x) => String(x).toLowerCase()));
    sel.ourlet = set.has('ourlet');
    sel.fourreau = set.has('fourreau');
    sel.renfort = set.has('renfort');
    sel.raccord_soudure = set.has('raccord') || set.has('raccord_soudure');
  } else if (typeof raw === 'string' && raw.trim()) {
    const parts = raw.split(/[,;|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    sel.ourlet = parts.includes('ourlet');
    sel.fourreau = parts.includes('fourreau');
    sel.renfort = parts.includes('renfort');
    sel.raccord_soudure = parts.some((p) => p.includes('raccord'));
  }

  if (truthy(config.finition_ourlet) || truthy(config.ourlet)) sel.ourlet = true;
  if (truthy(config.finition_fourreau) || truthy(config.fourreau)) sel.fourreau = true;
  if (truthy(config.finition_renfort) || truthy(config.renfort)) sel.renfort = true;
  if (truthy(config.finition_raccord) || truthy(config.raccord_soudure)) sel.raccord_soudure = true;

  return sel;
}

/**
 * Mètres linéaires facturables.
 * - Ourlet / renfort : périmètre 2×(L+l) × qty
 * - Fourreau : largeur (côté haut) × qty (+ bas si both)
 * - Raccord : mètres saisis, sinon 0 (assemblage géré à part)
 */
export function computeBacheFinishingMeters(
  sel: BacheFinishingsSelection,
  longueurM: number,
  largeurM: number,
  quantite: number,
): Partial<Record<BacheLinearFinishingKey, number>> {
  const qty = Math.max(1, quantite);
  const L = Math.max(0, longueurM);
  const l = Math.max(0, largeurM);
  const perimeter = 2 * (L + l);
  const out: Partial<Record<BacheLinearFinishingKey, number>> = {};

  if (sel.ourlet && perimeter > 0) out.ourlet = Math.round(perimeter * qty * 1000) / 1000;
  if (sel.renfort && perimeter > 0) out.renfort = Math.round(perimeter * qty * 1000) / 1000;

  if (sel.fourreau && L > 0) {
    const sides = sel.fourreauSides ?? 'top';
    const factor = sides === 'both' ? 2 : 1;
    out.fourreau = Math.round(L * factor * qty * 1000) / 1000;
  }

  if (sel.raccord_soudure) {
    const m = Number(sel.raccordMeters) || 0;
    if (m > 0) out.raccord_soudure = Math.round(m * qty * 1000) / 1000;
  }

  return out;
}

export function priceBacheFinishings(
  sel: BacheFinishingsSelection,
  longueurM: number,
  largeurM: number,
  quantite: number,
  rates: BacheFinishingsRates = ratesFromGfAdmin(),
): { lines: BacheFinishingLine[]; totalAr: number } {
  const metersMap = computeBacheFinishingMeters(sel, longueurM, largeurM, quantite);
  const rateByKey: Record<BacheLinearFinishingKey, number> = {
    ourlet: rates.ourletPerMlAr,
    fourreau: rates.fourreauPerMlAr,
    renfort: rates.renfortPerMlAr,
    raccord_soudure: rates.raccordPerMlAr,
  };

  const lines: BacheFinishingLine[] = [];
  for (const key of Object.keys(metersMap) as BacheLinearFinishingKey[]) {
    const meters = metersMap[key] ?? 0;
    const unitPriceAr = rateByKey[key];
    if (!(meters > 0) || !(unitPriceAr > 0)) continue;
    const totalAr = Math.round(meters * unitPriceAr);
    lines.push({
      key,
      label: LABELS[key],
      meters,
      unitPriceAr,
      totalAr,
    });
  }

  const totalAr = lines.reduce((s, l) => s + l.totalAr, 0);
  return { lines, totalAr };
}

export function toggleBacheFinishing(
  current: BacheFinishingsSelection,
  key: BacheLinearFinishingKey,
  on: boolean,
): BacheFinishingsSelection {
  return { ...current, [key]: on };
}

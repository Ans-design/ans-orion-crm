/**
 * Helpers partagés Soft Packaging : surface, vinyle GF, découpe/pose Finitions.
 * Les montants effectifs viennent des overlays Admin (runtime) — pas de vérité codée en dur métier.
 */
import { getEffectiveFinitionBasePrices } from '@/lib/finition/finition-price-catalog';
import { GF_ARTICLE_META } from '@/lib/grand-format/article-meta';

export type PrintZoneKind =
  | 'totale_avant'
  | 'totale_arriere'
  | 'recto_verso'
  | 'partielle'
  | 'sticker'
  | 'sans';

export function parseDimPairMm(raw: unknown): { w: number; h: number } | null {
  const s = String(raw ?? '').trim();
  if (!s || /personnalis/i.test(s)) return null;
  const m = s.replace(/,/g, '.').match(/(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)\s*(mm|cm)?/i);
  if (!m) return null;
  let w = parseFloat(m[1]!);
  let h = parseFloat(m[2]!);
  const unit = (m[3] ?? 'mm').toLowerCase();
  if (unit === 'cm') {
    w *= 10;
    h *= 10;
  }
  if (!(w > 0 && h > 0)) return null;
  return { w, h };
}

export function toMeters(value: number, unit: 'mm' | 'cm' | 'm' = 'mm'): number {
  if (!(value > 0)) return 0;
  if (unit === 'm') return value;
  if (unit === 'cm') return value / 100;
  return value / 1000;
}

export function surfaceM2FromMm(wMm: number, hMm: number, faces = 1): number {
  if (!(wMm > 0 && hMm > 0)) return 0;
  return (wMm / 1000) * (hMm / 1000) * Math.max(1, faces);
}

export function normalizePrintZone(raw: unknown): PrintZoneKind {
  const s = String(raw ?? '').toLowerCase();
  if (!s || /sans\s*impression|aucune/.test(s)) return 'sans';
  if (/recto[\s-]*verso|rv\b/.test(s)) return 'recto_verso';
  if (/arri[eè]re|verso/.test(s) && /total/.test(s)) return 'totale_arriere';
  if (/total/.test(s)) return 'totale_avant';
  if (/sticker|iquette|logo/.test(s)) return 'sticker';
  if (/partiel|personnalis/.test(s)) return 'partielle';
  return 'totale_avant';
}

export function calculatePrintAreaM2(input: {
  bagWidthMm: number;
  bagHeightMm: number;
  zone: PrintZoneKind | string;
  printWidthMm?: number;
  printHeightMm?: number;
}): { surfaceM2: number; faces: number; label: string } {
  const zone = typeof input.zone === 'string' ? normalizePrintZone(input.zone) : input.zone;
  if (zone === 'sans') {
    return { surfaceM2: 0, faces: 0, label: 'Sans impression' };
  }
  if (zone === 'partielle' || zone === 'sticker') {
    const w = Number(input.printWidthMm) || 0;
    const h = Number(input.printHeightMm) || 0;
    return {
      surfaceM2: surfaceM2FromMm(w, h, 1),
      faces: 1,
      label: zone === 'sticker' ? `Sticker ${w}×${h} mm` : `Zone personnalisée ${w}×${h} mm`,
    };
  }
  const faces = zone === 'recto_verso' ? 2 : 1;
  const w = Number(input.bagWidthMm) || 0;
  const h = Number(input.bagHeightMm) || 0;
  return {
    surfaceM2: surfaceM2FromMm(w, h, faces),
    faces,
    label:
      zone === 'recto_verso'
        ? 'Impression totale recto-verso'
        : zone === 'totale_arriere'
          ? 'Impression totale face arrière'
          : 'Impression totale face avant',
  };
}

/** Map label POS → article GF / clé matière */
export function resolveVinylGfArticleId(matiereImpression: string): string {
  const s = String(matiereImpression ?? '').toLowerCase();
  if (/transp/.test(s)) return 'gf-vinyl-transp';
  return 'gf-vinyl-blanc';
}

/** Prix m² vinyle — runtime Admin / défaut catalogue GF (fallback article-meta uniquement si aucun override) */
let vinylM2Overrides: Record<string, number> = {};

export function setVinylM2RuntimeOverrides(map: Record<string, number>) {
  vinylM2Overrides = { ...map };
}

export function getVinylM2Price(matiereImpression: string, override?: number): number {
  if (override != null && override > 0) return Math.round(override);
  const articleId = resolveVinylGfArticleId(matiereImpression);
  if (vinylM2Overrides[articleId] > 0) return Math.round(vinylM2Overrides[articleId]!);
  if (vinylM2Overrides[matiereImpression] > 0) return Math.round(vinylM2Overrides[matiereImpression]!);
  const meta = GF_ARTICLE_META[articleId];
  return Math.round(meta?.prixM2Fallback ?? 40000);
}

export function applyMinSurfaceAndPrice(
  surfaceM2: number,
  prixM2: number,
  opts?: { surfaceMinimumM2?: number; prixMinimum?: number },
): { billableM2: number; amount: number } {
  const minS = Math.max(0, Number(opts?.surfaceMinimumM2) || 0);
  const billableM2 = Math.max(surfaceM2, minS);
  const raw = Math.round(billableM2 * prixM2);
  const minP = Math.max(0, Number(opts?.prixMinimum) || 0);
  return { billableM2, amount: Math.max(raw, minP) };
}

export function resolveDecoupeVinylM2(override?: number): number {
  if (override != null && override > 0) return Math.round(override);
  return Math.round(getEffectiveFinitionBasePrices().decoupeAutocollantImprimePerM2);
}

export function resolvePosePetitPiece(override?: number): number {
  if (override != null && override > 0) return Math.round(override);
  return Math.round(getEffectiveFinitionBasePrices().posePetitFormat);
}

export function volumeRemisePackaging(qty: number, tiers?: Array<{ max: number | null; rate: number }>): number {
  if (!tiers?.length) return 0;
  for (const t of tiers) {
    if (t.max == null || qty <= t.max) return t.rate;
  }
  return tiers[tiers.length - 1]?.rate ?? 0;
}

import { PACKAGING_CHUTE_MM } from '@/lib/packaging/material-recap';
import { resolvePresentoirDimensionsMm } from '@/lib/data/plv-presentoir-catalog';
import { PLV_WASTE_MARGIN_MM } from '@/lib/data/plv-tariffs';
import {
  computePlvPrice,
  isPlvPricingArticle,
  resolvePlvPricingArticleId,
} from '@/lib/pricing/plv-pricing';
import { formatChipSortArea } from '@/lib/pos/format-chip-sort';

export type PlvMaterialRecap = {
  kind: 'plv';
  articleId: string;
  formatLabel: string;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  matiere: string;
  epaisseur: string;
  qty: number;
  realSurfaceM2: number;
  wasteMarginMm: number;
  grossSurfaceM2: number;
  totalGrossSurfaceM2: number;
  support: string;
  impression: string;
  finition: string;
  decoupe: string;
  façonnage: string;
  stockSummary: string;
  prixMatiere: number | null;
  prixImpression: number | null;
  prixFinition: number | null;
  prixFaçonnage: number | null;
  prixUnitaire: number | null;
  prixCalculable: boolean;
  margeRule: string;
  incomplete?: boolean;
};

function parseQty(config: Record<string, unknown>): number {
  const n = Number(config.qty ?? config.quantite ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function resolvePanelMm(config: Record<string, unknown>): {
  w: number;
  h: number;
  label: string;
} | null {
  const canonical = resolvePlvPricingArticleId(String(config._articleId ?? ''));
  if (canonical === 'plv-presentoir-magasin') {
    const dims = resolvePresentoirDimensionsMm(config);
    if (!dims) return null;
    return { w: dims.widthMm, h: dims.heightMm, label: dims.formatLabel };
  }

  const format = String(config.format ?? '');
  if (/personnalis/i.test(format)) {
    const w = Number(config.longueur ?? config.largeur_mm);
    const h = Number(config.largeur ?? config.hauteur_mm);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return { w, h, label: format };
    }
    return null;
  }

  const area = formatChipSortArea(format);
  if (area == null) return null;
  const side = Math.sqrt(area);
  const aMatch = format.match(/\b(A[0-7]\+?)\b/i);
  if (aMatch) {
    const sizes: Record<string, [number, number]> = {
      A6: [105, 148], A5: [148, 210], A4: [210, 297], A3: [297, 420],
      A2: [420, 594], A1: [594, 841], A0: [841, 1189],
    };
    const k = aMatch[1].toUpperCase();
    const std = sizes[k];
    if (std) return { w: std[0], h: std[1], label: format };
  }
  return { w: Math.round(side), h: Math.round(area / side), label: format };
}

export function calculatePlvMaterialRecap(
  articleId: string,
  config: Record<string, unknown>,
): PlvMaterialRecap | null {
  if (!isPlvPricingArticle(articleId)) return null;

  const canonical = resolvePlvPricingArticleId(articleId);
  const pricing = computePlvPrice(articleId, config, parseQty(config));
  const grossM2 = pricing.grossSurfaceM2 ?? 0;
  const qty = parseQty(config);
  const presentoir = canonical === 'plv-presentoir-magasin'
    ? resolvePresentoirDimensionsMm(config)
    : null;
  const panel = presentoir
    ? { w: presentoir.widthMm, h: presentoir.heightMm, label: presentoir.formatLabel }
    : resolvePanelMm({ ...config, _articleId: articleId });

  if (grossM2 <= 0 && !pricing.calculable && !panel && !presentoir) {
    const matiere = String(config.matiere ?? config.tissu ?? config.support ?? '—');
    const epaisseur = String(config.epaisseur ?? config.grammage ?? '—');
    return {
      kind: 'plv',
      articleId: canonical,
      formatLabel: String(config.format ?? '—'),
      widthMm: null,
      heightMm: null,
      depthMm: null,
      matiere,
      epaisseur,
      qty,
      realSurfaceM2: 0,
      wasteMarginMm: PLV_WASTE_MARGIN_MM,
      grossSurfaceM2: 0,
      totalGrossSurfaceM2: 0,
      support: String(config.type ?? config.structure ?? '—'),
      impression: String(config.face ?? config.impression ?? config.couleur ?? '—'),
      finition: String(config.finition ?? config.finition_pelliculage ?? config.finition_surface ?? '—'),
      decoupe: config.decoupe ? 'Oui' : 'Standard',
      façonnage: '—',
      stockSummary: '—',
      prixMatiere: null,
      prixImpression: null,
      prixFinition: null,
      prixFaçonnage: null,
      prixUnitaire: null,
      prixCalculable: false,
      margeRule: `Surface brute +100 mm — chute +${PACKAGING_CHUTE_MM} mm/côté`,
      incomplete: true,
    };
  }

  if (grossM2 <= 0 && !pricing.calculable) return null;

  const matiere = String(config.matiere ?? config.tissu ?? config.support ?? '—');
  const epaisseur = String(config.epaisseur ?? config.grammage ?? '—');
  const finition = String(config.finition ?? config.finition_pelliculage ?? config.finition_surface ?? '—');
  const impression = String(config.face ?? config.impression ?? config.couleur ?? '—');

  const realM2 = presentoir
    ? presentoir.developpeM2
    : panel
      ? parseFloat(((panel.w * panel.h) / 1_000_000).toFixed(6))
      : grossM2;

  return {
    kind: 'plv',
    articleId: canonical,
    formatLabel: panel?.label ?? String(config.format ?? '—'),
    widthMm: presentoir?.widthMm ?? panel?.w ?? null,
    heightMm: presentoir?.heightMm ?? panel?.h ?? null,
    depthMm: presentoir?.depthMm ?? (Number(config.profondeur_mm) || null),
    matiere,
    epaisseur,
    qty,
    realSurfaceM2: realM2,
    wasteMarginMm: PLV_WASTE_MARGIN_MM,
    grossSurfaceM2: grossM2,
    totalGrossSurfaceM2: parseFloat((grossM2 * qty).toFixed(6)),
    support: String(config.type ?? config.structure ?? '—'),
    impression,
    finition,
    decoupe: config.decoupe ? 'Oui' : 'Standard',
    façonnage: [
      config.rainage ? 'Rainage' : null,
      config.collage ? 'Collage' : null,
      config.structure ? String(config.structure) : null,
    ].filter(Boolean).join(' · ') || '—',
    stockSummary: `${matiere} ${epaisseur !== '—' ? epaisseur : ''} — ${grossM2} m²/pièce`.trim(),
    prixMatiere: pricing.breakdown?.prixMatiere ?? null,
    prixImpression: pricing.breakdown?.prixImpression ?? null,
    prixFinition: pricing.breakdown?.prixFinition ?? null,
    prixFaçonnage: pricing.breakdown?.prixFaçonnage ?? null,
    prixUnitaire: pricing.calculable ? pricing.prixUnitaire : null,
    prixCalculable: pricing.calculable,
    margeRule: `Surface brute +100 mm — chute +${PACKAGING_CHUTE_MM} mm/côté`,
  };
}

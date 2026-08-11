import type { CatalogueItem } from '@/lib/data/catalogue';
import { FLYER_SILHOUETTE_BY_FORMAT } from '@/lib/pos/flyer-catalog';

/** Dimensions ISO 216 & formats imprimerie (mm) */
export const PAPER_MM: Record<string, { w: number; h: number }> = {
  A0: { w: 841, h: 1189 },
  A1: { w: 594, h: 841 },
  A2: { w: 420, h: 594 },
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  A6: { w: 105, h: 148 },
  A7: { w: 74, h: 105 },
  B5: { w: 176, h: 250 },
  DL: { w: 99, h: 210 },
  SRA3: { w: 320, h: 450 },
  '85×55': { w: 85, h: 55 },
  '90×90': { w: 90, h: 90 },
};

export type SilhouetteKind =
  | 'flat'
  | 'rollup'
  | 'xbanner'
  | 'box'
  | 'book'
  | 'notebook'
  | 'chevalet'
  | 'flag'
  | 'mug'
  | 'bag'
  | 'sticker'
  | 'panel'
  | 'card'
  | 'tshirt'
  | 'polo'
  | 'sweat'
  | 'cap'
  | 'tote'
  | 'pen'
  | 'canvas'
  | 'maillot'
  | 'totem';

export type SilhouetteSpec = {
  kind: SilhouetteKind;
  widthMm: number;
  heightMm: number;
  depthMm?: number;
  label: string;
  orientation?: 'portrait' | 'landscape';
};

function parseDimPair(text: string): { w: number; h: number } | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)?/i);
  if (!m) return null;
  let w = parseFloat(m[1].replace(',', '.'));
  let h = parseFloat(m[2].replace(',', '.'));
  const unit = (m[3] || 'mm').toLowerCase();
  if (unit === 'cm') { w *= 10; h *= 10; }
  if (unit === 'm') { w *= 1000; h *= 1000; }
  return { w, h };
}

function formatDimLabel(w: number, h: number, depth?: number): string {
  const fmt = (n: number) => (n >= 100 ? Math.round(n) : Math.round(n * 10) / 10);
  if (depth != null && depth > 0) {
    return `${fmt(w)} × ${fmt(h)} × ${fmt(depth)} mm`;
  }
  if (w >= 1000 || h >= 1000) {
    return `${(w / 10).toFixed(0)} × ${(h / 10).toFixed(0)} cm`;
  }
  return `${fmt(w)} × ${fmt(h)} mm`;
}

function paperFromToken(token: string): { w: number; h: number } | null {
  const t = token.toUpperCase().replace(/\s+/g, '');
  if (PAPER_MM[t]) return PAPER_MM[t];
  if (t === 'DL' || t.includes('1/3A4')) return PAPER_MM.DL;
  const iso = t.match(/\b(A[0-7]|B5|SRA3)\b/);
  if (iso && PAPER_MM[iso[1]]) return PAPER_MM[iso[1]];
  const dim = parseDimPair(token);
  if (dim) return dim;
  return null;
}

function specFromConfig(config?: Record<string, unknown>): SilhouetteSpec | null {
  if (!config) return null;

  const L = Number(config.L ?? config.longueur ?? config.custom_width);
  const H = Number(config.H ?? config.hauteur ?? config.custom_height);
  const P = Number(config.P ?? config.profondeur ?? config.custom_depth ?? config.custom_gusset);

  if (L > 0 && H > 0 && P > 0) {
    return {
      kind: 'box',
      widthMm: L,
      heightMm: H,
      depthMm: P,
      label: formatDimLabel(L, H, P),
    };
  }

  const lw = Number(config.largeur);
  const lh = Number(config.hauteur);
  if (lw > 0 && lh > 0) {
    const w = lw <= 50 ? lw * 10 : lw;
    const h = lh <= 50 ? lh * 10 : lh;
    return { kind: 'flat', widthMm: w, heightMm: h, label: formatDimLabel(w, h) };
  }

  if (L > 0 && H > 0) {
    return { kind: 'flat', widthMm: L, heightMm: H, label: formatDimLabel(L, H) };
  }

  const format = String(config.format ?? config.format_marquage ?? config.modele ?? '');
  if (!format) return null;

  const flyerSpec = FLYER_SILHOUETTE_BY_FORMAT[format];
  if (flyerSpec) {
    return { kind: 'flat', ...flyerSpec };
  }

  const dims = parseDimPair(format);
  if (dims) {
    const kind = format.toLowerCase().includes('roll') || (dims.h > dims.w * 2.5 && dims.h >= 1500)
      ? 'rollup'
      : format.toLowerCase().includes('x-banner') || format.toLowerCase().includes('xbanner')
        ? 'xbanner'
        : 'flat';
    return { kind, widthMm: dims.w, heightMm: dims.h, label: formatDimLabel(dims.w, dims.h) };
  }

  const paper = paperFromToken(format);
  if (paper) {
    const lower = format.toLowerCase();
    const isBlocNote =
      'produit' in config ||
      'nombre_feuilles' in config ||
      'type_support_couverture' in config;
    let kind: SilhouetteKind = 'flat';
    if (isBlocNote) kind = 'notebook';
    else if (lower.includes('chevalet')) kind = 'chevalet';
    else if (lower.includes('bloc') || lower.includes('carnet')) kind = 'notebook';
    else if (lower.includes('book') || lower.includes('livret') || lower.includes('magazine')) kind = 'book';
    return { kind, widthMm: paper.w, heightMm: paper.h, label: formatDimLabel(paper.w, paper.h) };
  }

  return null;
}

const ID_SPECS: Record<string, Omit<SilhouetteSpec, 'label'> & { label?: string }> = {
  'fly-std': { kind: 'flat', widthMm: 148, heightMm: 210, label: 'A5 — 148×210 mm' },
  'plv-rollup': { kind: 'rollup', widthMm: 800, heightMm: 2000, label: '80×200 cm' },
  'plv-xbanner': { kind: 'xbanner', widthMm: 600, heightMm: 1600, label: '60×160 cm' },
  'plv-chevalet': { kind: 'chevalet', widthMm: 148, heightMm: 210, label: 'Chevalet A5' },
  'plv-presentoir-sol': { kind: 'flat', widthMm: 594, heightMm: 841, label: 'A1 — 594×841 mm' },
  'plv-presentoir-magasin': { kind: 'totem', widthMm: 400, heightMm: 1800, label: 'Présentoir magasin' },
  'plv-chevalet-table': { kind: 'chevalet', widthMm: 148, heightMm: 210, label: 'Chevalet A5' },
  'plv-oriflamme': { kind: 'flag', widthMm: 400, heightMm: 3000, label: 'Oriflamme ~3 m' },
  'cv-std': { kind: 'card', widthMm: 85, heightMm: 55, label: '85×55 mm', orientation: 'landscape' },
  'cv-fidelite': { kind: 'card', widthMm: 85, heightMm: 55, label: '85×55 mm', orientation: 'landscape' },
  'tx-tshirt': { kind: 'tshirt', widthMm: 500, heightMm: 700, label: 'T-Shirt' },
  'tx-polo': { kind: 'polo', widthMm: 500, heightMm: 700, label: 'Polo' },
  'tx-sweat': { kind: 'sweat', widthMm: 520, heightMm: 720, label: 'Sweat' },
  'tx-casquette': { kind: 'cap', widthMm: 280, heightMm: 180, label: 'Casquette' },
  'tx-bob': { kind: 'cap', widthMm: 280, heightMm: 180, label: 'Bob' },
  'tx-maillot': { kind: 'tshirt', widthMm: 480, heightMm: 680, label: 'Maillot' },
  'tx-totebag': { kind: 'tote', widthMm: 360, heightMm: 400, label: 'Tote bag' },
  'gd-mug': { kind: 'mug', widthMm: 80, heightMm: 95, label: 'Mug Ø 8 cm' },
  'gd-stylo': { kind: 'pen', widthMm: 140, heightMm: 12, label: 'Stylo' },
  'gf-toile': { kind: 'canvas', widthMm: 600, heightMm: 800, label: 'Toile châssis' },
  'bn-bloc-note': { kind: 'notebook', widthMm: 148, heightMm: 210, label: 'Bloc-note' },
  'bn-a4': { kind: 'notebook', widthMm: 210, heightMm: 297, label: 'Bloc A4' },
  'bn-a5': { kind: 'notebook', widthMm: 148, heightMm: 210, label: 'Bloc A5' },
  'bn-b5': { kind: 'notebook', widthMm: 176, heightMm: 250, label: 'Bloc B5' },
  'bn-a6': { kind: 'notebook', widthMm: 105, heightMm: 148, label: 'Bloc A6' },
  'bn-agenda': { kind: 'notebook', widthMm: 148, heightMm: 210, label: 'Agenda A5' },
  'cal-chevalet': { kind: 'chevalet', widthMm: 148, heightMm: 210, label: 'Chevalet A5' },
  'cal-chevalet-table': { kind: 'chevalet', widthMm: 210, heightMm: 297, label: 'Chevalet A4' },
  'pkg-boite': { kind: 'box', widthMm: 200, heightMm: 150, depthMm: 80, label: 'Boîte (cotes à configurer)' },
};

function specFromArticleId(id: string): SilhouetteSpec | null {
  const direct = ID_SPECS[id];
  if (direct) {
    return {
      kind: direct.kind ?? 'flat',
      widthMm: direct.widthMm ?? 210,
      heightMm: direct.heightMm ?? 297,
      depthMm: direct.depthMm,
      label: direct.label ?? formatDimLabel(direct.widthMm ?? 210, direct.heightMm ?? 297, direct.depthMm),
      orientation: direct.orientation,
    };
  }

  const idLower = id.toLowerCase();
  for (const [key, fmt] of Object.entries(PAPER_MM)) {
    if (idLower.includes(`-${key.toLowerCase()}`) || idLower.endsWith(key.toLowerCase())) {
      const kind = idLower.includes('bn-') || idLower.includes('bloc') ? 'notebook' as const
        : idLower.includes('bk-') || idLower.includes('livre') ? 'book' as const
        : 'flat' as const;
      return { kind, widthMm: fmt.w, heightMm: fmt.h, label: `${key} — ${formatDimLabel(fmt.w, fmt.h)}` };
    }
  }

  if (idLower.includes('rollup')) return { kind: 'rollup', widthMm: 800, heightMm: 2000, label: '80×200 cm' };
  if (idLower.includes('xbanner') || idLower.includes('x-banner')) return { kind: 'xbanner', widthMm: 600, heightMm: 1600, label: '60×160 cm' };
  if (idLower.includes('tshirt') || idLower.includes('tx-tshirt')) return { kind: 'tshirt', widthMm: 500, heightMm: 700, label: 'T-Shirt' };
  if (idLower.includes('polo')) return { kind: 'polo', widthMm: 500, heightMm: 700, label: 'Polo' };
  if (idLower.includes('sweat')) return { kind: 'sweat', widthMm: 520, heightMm: 720, label: 'Sweat' };
  if (idLower.includes('casquette') || idLower.includes('bob')) return { kind: 'cap', widthMm: 280, heightMm: 180, label: 'Casquette' };
  if (idLower.includes('maillot')) return { kind: 'maillot', widthMm: 480, heightMm: 680, label: 'Maillot' };
  if (idLower.includes('totebag') || idLower.includes('tote')) return { kind: 'tote', widthMm: 360, heightMm: 400, label: 'Tote bag' };
  if (idLower.includes('stylo') || idLower.includes('gd-stylo')) return { kind: 'pen', widthMm: 140, heightMm: 12, label: 'Stylo' };
  if (idLower.includes('toile') || idLower.includes('canvas')) return { kind: 'canvas', widthMm: 600, heightMm: 800, label: 'Toile' };
  if (idLower.includes('carte') || idLower.includes('carterie') || idLower.includes('cv-')) return { kind: 'card', widthMm: 85, heightMm: 55, label: '85×55 mm', orientation: 'landscape' };
  if (idLower.includes('boite') || idLower.includes('pkg-')) return { kind: 'box', widthMm: 200, heightMm: 150, depthMm: 80, label: 'Packaging' };
  if (idLower.includes('mug') || idLower.includes('gd-mug')) return { kind: 'mug', widthMm: 80, heightMm: 95, label: 'Mug' };
  if (idLower.includes('hangtag') || idLower.includes('etiquette')) return { kind: 'sticker', widthMm: 50, heightMm: 80, label: 'Étiquette' };

  return null;
}

function specFromCategory(category: string, name: string): SilhouetteSpec {
  const n = name.toLowerCase();
  if (category === 'plv') {
    if (n.includes('roll')) return { kind: 'rollup', widthMm: 800, heightMm: 2000, label: 'Roll-up 80×200 cm' };
    if (n.includes('x-banner') || n.includes('x banner')) return { kind: 'xbanner', widthMm: 600, heightMm: 1600, label: 'X-Banner 60×160 cm' };
    if (n.includes('oriflamme') || n.includes('fanion')) return { kind: 'flag', widthMm: 400, heightMm: 3000, label: 'Oriflamme' };
    return { kind: 'chevalet', widthMm: 297, heightMm: 420, label: 'PLV A3' };
  }
  if (category === 'flyers' || category === 'document' || category === 'impression') return { kind: 'flat', widthMm: 210, heightMm: 297, label: 'A4' };
  if (category === 'carterie') return { kind: 'card', widthMm: 85, heightMm: 55, label: '85×55 mm', orientation: 'landscape' };
  if (category === 'livres') return { kind: 'book', widthMm: 148, heightMm: 210, label: 'Format livret A5' };
  if (category === 'notes') return { kind: 'notebook', widthMm: 148, heightMm: 210, label: 'Bloc-note A5' };
  if (category === 'packaging') return { kind: 'box', widthMm: 200, heightMm: 150, depthMm: 80, label: 'Packaging' };
  if (category === 'grand_format') return { kind: 'panel', widthMm: 1000, heightMm: 700, label: 'Grand format' };
  if (category === 'textile') {
    if (n.includes('polo')) return { kind: 'polo', widthMm: 500, heightMm: 700, label: 'Polo' };
    if (n.includes('sweat')) return { kind: 'sweat', widthMm: 520, heightMm: 720, label: 'Sweat' };
    if (n.includes('casquette') || n.includes('bob')) return { kind: 'cap', widthMm: 280, heightMm: 180, label: 'Casquette' };
    if (n.includes('tote')) return { kind: 'tote', widthMm: 360, heightMm: 400, label: 'Tote bag' };
    return { kind: 'tshirt', widthMm: 500, heightMm: 700, label: 'T-Shirt' };
  }
  if (category === 'goodies') {
    if (n.includes('stylo')) return { kind: 'pen', widthMm: 140, heightMm: 12, label: 'Stylo' };
    return { kind: 'mug', widthMm: 80, heightMm: 95, label: 'Mug' };
  }
  if (category === 'carterie') return { kind: 'card', widthMm: 85, heightMm: 55, label: '85×55 mm', orientation: 'landscape' };
  return { kind: 'flat', widthMm: 210, heightMm: 297, label: 'Format standard' };
}

/** Applique orientation portrait/paysage depuis la config utilisateur */
function applyOrientation(spec: SilhouetteSpec, config?: Record<string, unknown>): SilhouetteSpec {
  const o = String(config?.orientation ?? '').toLowerCase();
  if (o.includes('paysage') || o.includes('landscape') || o === 'horizontal') {
    return { ...spec, orientation: 'landscape' };
  }
  if (o.includes('portrait') || o === 'vertical') {
    return { ...spec, orientation: 'portrait' };
  }
  return spec;
}

/** Résout silhouette proportionnelle depuis article + config live */
export function resolveSilhouette(
  item: Pick<CatalogueItem, 'id' | 'name' | 'category'>,
  config?: Record<string, unknown>,
): SilhouetteSpec {
  const fromConfig = specFromConfig(config);
  if (fromConfig) {
    const fromId = specFromArticleId(item.id);
    if (fromId && (fromConfig.kind === 'flat' || fromConfig.kind === 'rollup' || fromConfig.kind === 'xbanner')) {
      return applyOrientation({ ...fromConfig, kind: fromId.kind === 'rollup' ? 'rollup' : fromId.kind === 'xbanner' ? 'xbanner' : fromConfig.kind }, config);
    }
    return applyOrientation(fromConfig, config);
  }

  const fromId = specFromArticleId(item.id);
  if (fromId) return applyOrientation(fromId, config);

  const fromName = paperFromToken(item.name);
  if (fromName) {
    return applyOrientation({ kind: 'flat', widthMm: fromName.w, heightMm: fromName.h, label: formatDimLabel(fromName.w, fromName.h) }, config);
  }

  return applyOrientation(specFromCategory(item.category, item.name), config);
}

/** Calcule taille CSS (px) en conservant le ratio dans une boîte maxW × maxH */
export function fitSilhouetteSize(
  spec: SilhouetteSpec,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  let w = spec.widthMm;
  let h = spec.heightMm;
  if (spec.orientation === 'landscape' && w < h) [w, h] = [h, w];

  const ratio = w / h;
  let width = maxW;
  let height = width / ratio;
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

import type { FinishVisualStyle, MaterialVisualStyle } from '@/lib/pos-preview/preview-types';

const MATERIAL_BASE: Record<string, MaterialVisualStyle> = {
  white: { id: 'white', label: 'Blanc', gloss: 0.15, opacity: 1, textureClass: 'mat-paper', shadowIntensity: 0.35 },
  kraft: { id: 'kraft', label: 'Kraft', gloss: 0.08, opacity: 1, textureClass: 'kraft-fiber', shadowIntensity: 0.4 },
  glossy: { id: 'glossy', label: 'Brillant', gloss: 0.75, opacity: 1, textureClass: 'gloss-coat', shadowIntensity: 0.45 },
  matte: { id: 'matte', label: 'Mat', gloss: 0.12, opacity: 1, textureClass: 'mat-paper', shadowIntensity: 0.38 },
  fabric: { id: 'fabric', label: 'Tissu', gloss: 0.05, opacity: 1, textureClass: 'fabric-weave', shadowIntensity: 0.3 },
  metal: { id: 'metal', label: 'Métal', gloss: 0.85, opacity: 1, textureClass: 'metal-brush', shadowIntensity: 0.5 },
  glass: { id: 'glass', label: 'Verre / sablé', gloss: 0.55, opacity: 0.72, textureClass: 'frosted-glass', shadowIntensity: 0.42 },
  transparent: { id: 'transparent', label: 'Transparent', gloss: 0.6, opacity: 0.55, textureClass: 'acrylic-clear', shadowIntensity: 0.48 },
  cardboard: { id: 'cardboard', label: 'Carton', gloss: 0.1, opacity: 1, textureClass: 'corrugated', shadowIntensity: 0.36 },
  vinyl: { id: 'vinyl', label: 'Vinyle', gloss: 0.35, opacity: 1, textureClass: 'vinyl-adhesive', shadowIntensity: 0.4 },
};

const FINISH_BASE: Record<string, FinishVisualStyle> = {
  mat: { id: 'mat', label: 'Mat', glossBoost: -0.2 },
  brillant: { id: 'brillant', label: 'Brillant', glossBoost: 0.35, overlayClass: 'finish-gloss-highlight' },
  pelliculage: { id: 'pelliculage', label: 'Pelliculage', glossBoost: 0.25, overlayClass: 'finish-laminate' },
  plastification: { id: 'plastification', label: 'Plastification', glossBoost: 0.3, overlayClass: 'finish-laminate' },
  vernis: { id: 'vernis', label: 'Vernis', glossBoost: 0.4, overlayClass: 'finish-varnish' },
  spirale: { id: 'spirale', label: 'Spirale', glossBoost: 0, overlayClass: 'binding-spiral' },
  agrafe: { id: 'agrafe', label: 'Agrafé', glossBoost: 0, overlayClass: 'binding-staple' },
  dcc: { id: 'dcc', label: 'Dos carré collé', glossBoost: 0.05, overlayClass: 'binding-perfect' },
};

function pickConfigString(config: Record<string, unknown> | undefined, keys: string[]): string {
  if (!config) return '';
  for (const k of keys) {
    const v = config[k];
    if (v != null && String(v).trim()) return String(v).toLowerCase();
  }
  return '';
}

export function getMaterialVisualStyle(
  materialKey: string | undefined,
  config?: Record<string, unknown>,
): MaterialVisualStyle {
  const fromConfig = pickConfigString(config, ['matiere', 'matiere_support', 'support', 'type_support', 'couleur_support']);
  const key = (fromConfig || materialKey || 'white').toLowerCase();

  if (key.includes('kraft')) return MATERIAL_BASE.kraft;
  if (key.includes('tissu') || key.includes('polyester') || key.includes('coton')) return MATERIAL_BASE.fabric;
  if (key.includes('vinyl') || key.includes('autocoll')) return MATERIAL_BASE.vinyl;
  if (key.includes('plexi') || key.includes('acryl') || key.includes('transparent')) return MATERIAL_BASE.transparent;
  if (key.includes('pvc') || key.includes('forex')) return MATERIAL_BASE.white;
  if (key.includes('mesh') || key.includes('bache') || key.includes('bâche')) return { ...MATERIAL_BASE.fabric, label: 'Bâche souple' };
  if (key.includes('metal') || key.includes('métal')) return MATERIAL_BASE.metal;

  return MATERIAL_BASE[materialKey as keyof typeof MATERIAL_BASE] ?? MATERIAL_BASE.white;
}

export function getFinishVisualStyle(config?: Record<string, unknown>): FinishVisualStyle {
  const raw = pickConfigString(config, ['finition', 'finitions', 'pelliculage', 'vernis', 'reliure', 'type_reliure']);
  if (raw.includes('brill')) return FINISH_BASE.brillant;
  if (raw.includes('mat')) return FINISH_BASE.mat;
  if (raw.includes('pellicul')) return FINISH_BASE.pelliculage;
  if (raw.includes('plastif')) return FINISH_BASE.plastification;
  if (raw.includes('vernis')) return FINISH_BASE.vernis;
  if (raw.includes('spiral')) return FINISH_BASE.spirale;
  if (raw.includes('agra') || raw.includes('piq')) return FINISH_BASE.agrafe;
  if (raw.includes('dos carr') || raw.includes('collé')) return FINISH_BASE.dcc;
  return { id: 'none', label: 'Standard', glossBoost: 0 };
}

export function getThicknessFromGrammage(grammage: number | undefined, pages?: number): number {
  const g = grammage ?? 135;
  const p = pages ?? 1;
  return Math.min(48, Math.max(2, (g / 300) * Math.sqrt(p) * 8));
}

export function getSurfaceTextureClass(family: string): string {
  if (family.includes('grand-format')) return 'texture-soft-banner';
  if (family.includes('textile')) return 'texture-fabric';
  if (family.includes('objets')) return 'texture-object';
  return 'texture-paper';
}

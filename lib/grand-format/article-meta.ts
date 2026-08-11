import type { GfStockKind } from '@/lib/grand-format/types';
import { entryGrandFormatPrix2026 } from '@/lib/data/prix-2026-grids/grand-format';

export type GfArticleMeta = {
  stockKind: GfStockKind;
  materialKeys: string[];
  prixM2Fallback?: number;
  /** Grammage fixe (propriété technique, non choix POS). */
  fixedGrammage?: string;
};

function m2(id: string, fallback: number): number {
  return entryGrandFormatPrix2026(id) ?? fallback;
}

/** Mapping article POS → clés stock / matière (source unique métier GF). */
export const GF_ARTICLE_META: Record<string, GfArticleMeta> = {
  'gf-vinyl-blanc': { stockKind: 'rouleau', materialKeys: ['Vinyle blanc brillant', 'Vinyle blanc', 'Autocollant'], prixM2Fallback: m2('gf-vinyl-blanc', 20000) },
  'gf-vinyl-transp': { stockKind: 'rouleau', materialKeys: ['Vinyle transparent', 'Vinyle'], prixM2Fallback: m2('gf-vinyl-transp', 22000) },
  'gf-oneway': { stockKind: 'rouleau', materialKeys: ['One-Way', 'Vision', 'microperforé'], prixM2Fallback: m2('gf-oneway', 30000), fixedGrammage: '140g' },
  'gf-reflechissant': { stockKind: 'rouleau', materialKeys: ['réfléchissant', 'Réfléchissant', 'Reflechissant'], prixM2Fallback: m2('gf-reflechissant', 46000) },
  'gf-frosted': { stockKind: 'rouleau', materialKeys: ['Frosted', 'sablé', 'dépoli'], prixM2Fallback: m2('gf-frosted', 46000) },
  'gf-dosbleu': { stockKind: 'rouleau', materialKeys: ['Dos bleu', 'dos bleu'], prixM2Fallback: m2('gf-dosbleu', 23000) },
  'gf-bache': {
    stockKind: 'rouleau',
    materialKeys: ['Bâche', '440', 'Bache', 'mesh', 'Mesh', '270', 'microperforée', '320', '240', '510', '650'],
    prixM2Fallback: m2('gf-bache', 20000),
  },
  'gf-bache440': {
    stockKind: 'rouleau',
    materialKeys: ['Bâche', '440', 'Bache'],
    prixM2Fallback: m2('gf-bache440', 20000),
  },
  'gf-mesh': { stockKind: 'rouleau', materialKeys: ['mesh', 'Mesh', '270', 'microperforée'], prixM2Fallback: m2('gf-mesh', 20000) },
  'gf-bache320': { stockKind: 'rouleau', materialKeys: ['Bâche', '320', '240'], prixM2Fallback: m2('gf-bache320', 30000) },
  'gf-tissu': { stockKind: 'rouleau', materialKeys: ['Tissu', 'drapeau', 'polyester'], prixM2Fallback: m2('gf-tissu', 30000) },
  'gf-photo': { stockKind: 'rouleau', materialKeys: ['Photo', 'Papier photo', 'PP film'], prixM2Fallback: m2('gf-photo', 25000), fixedGrammage: '140g' },
  'gf-pp': { stockKind: 'rouleau', materialKeys: ['PP film', 'PP indéchirable'], prixM2Fallback: m2('gf-pp', 20000) },
  'gf-pvc': { stockKind: 'plaque', materialKeys: ['PVC', 'Forex'], prixM2Fallback: m2('gf-pvc', 110000) },
  'gf-pvc3': { stockKind: 'plaque', materialKeys: ['PVC', '3mm', 'Forex'], prixM2Fallback: m2('gf-pvc3', 110000) },
  'gf-pvc6': { stockKind: 'plaque', materialKeys: ['PVC', '5mm', '6mm'], prixM2Fallback: m2('gf-pvc6', 160000) },
  'gf-plexi': { stockKind: 'plaque', materialKeys: ['Plexi', 'Plexiglas'], prixM2Fallback: m2('gf-plexi', 200000) },
  'gf-plexi3': { stockKind: 'plaque', materialKeys: ['Plexi', 'Plexiglas', '3mm'], prixM2Fallback: m2('gf-plexi3', 200000) },
  'gf-plexi5': { stockKind: 'plaque', materialKeys: ['Plexi', 'Plexiglas', '5mm'], prixM2Fallback: m2('gf-plexi5', 240000) },
  'gf-acrylic': { stockKind: 'plaque', materialKeys: ['Acrylic', 'Acrylique'], prixM2Fallback: m2('gf-acrylic', 200000) },
  'gf-toile': { stockKind: 'rouleau', materialKeys: ['Toile', 'canvas'], prixM2Fallback: m2('gf-toile', 30000) },
};

export function isGrandFormatArticleId(articleId: string): boolean {
  return articleId.startsWith('gf-') || GF_ARTICLE_META[articleId] != null;
}

export function getGfArticleMeta(articleId: string): GfArticleMeta | null {
  return GF_ARTICLE_META[articleId] ?? null;
}

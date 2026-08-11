/**
 * Défauts Admin Sac en papier (pkg-sac).
 */
import type { PackagingArrondiMode } from '@/lib/packaging/packaging-a4-equivalence';

export type PaperBagTemplateDefault = {
  typeSac: string;
  formuleSurface: string;
  coefficientFond: number;
  rabatHautMm: number;
  patteCollageMm: number;
  margeDechetsPct: number;
  actif: boolean;
  visiblePos: boolean;
  commentaire: string;
};

export type PaperBagMarginDefault = {
  scope: 'global';
  articleId: string | null;
  typeSac: string | null;
  margeDechetsPct: number;
  beneficePct: number;
  margeDepensePct: number;
  arrondiMode: PackagingArrondiMode;
  actif: boolean;
  commentaire: string;
};

export type PaperBagAccessoryDefault = {
  accessoire: string;
  type?: string;
  unite: string;
  prixHt: number;
};

export const DEFAULT_PAPER_BAG_MARGIN: PaperBagMarginDefault = {
  scope: 'global',
  articleId: 'pkg-sac',
  typeSac: null,
  margeDechetsPct: 10,
  beneficePct: 30,
  margeDepensePct: 10,
  arrondiMode: 'exact',
  actif: true,
  commentaire: 'Défaut métier — prixFinal = dépenses × 1,40',
};

export const DEFAULT_PAPER_BAG_TEMPLATES: PaperBagTemplateDefault[] = [
  {
    typeSac: 'Sac papier avec soufflet',
    formuleSurface: '(2L+2P+patte)×(H+rabat+fond)',
    coefficientFond: 0.85,
    rabatHautMm: 30,
    patteCollageMm: 20,
    margeDechetsPct: 10,
    actif: true,
    visiblePos: true,
    commentaire: 'Développé standard soufflet',
  },
  {
    typeSac: 'Sac papier simple',
    formuleSurface: '(2L+2P+patte)×(H+rabat+fond)',
    coefficientFond: 0.7,
    rabatHautMm: 25,
    patteCollageMm: 15,
    margeDechetsPct: 10,
    actif: true,
    visiblePos: true,
    commentaire: '',
  },
  {
    typeSac: 'Sac kraft',
    formuleSurface: '(2L+2P+patte)×(H+rabat+fond)',
    coefficientFond: 0.85,
    rabatHautMm: 30,
    patteCollageMm: 20,
    margeDechetsPct: 10,
    actif: true,
    visiblePos: true,
    commentaire: '',
  },
  {
    typeSac: 'Sac luxe avec poignées corde',
    formuleSurface: '(2L+2P+patte)×(H+rabat+fond)',
    coefficientFond: 1,
    rabatHautMm: 40,
    patteCollageMm: 25,
    margeDechetsPct: 10,
    actif: true,
    visiblePos: true,
    commentaire: '',
  },
  {
    typeSac: 'Sac avec poignées torsadées',
    formuleSurface: '(2L+2P+patte)×(H+rabat+fond)',
    coefficientFond: 0.85,
    rabatHautMm: 30,
    patteCollageMm: 20,
    margeDechetsPct: 10,
    actif: true,
    visiblePos: true,
    commentaire: '',
  },
  {
    typeSac: 'Sac avec poignées plates',
    formuleSurface: '(2L+2P+patte)×(H+rabat+fond)',
    coefficientFond: 0.85,
    rabatHautMm: 30,
    patteCollageMm: 20,
    margeDechetsPct: 10,
    actif: true,
    visiblePos: true,
    commentaire: '',
  },
  {
    typeSac: 'Sac fond plat',
    formuleSurface: '(2L+2P+patte)×(H+rabat+fond)',
    coefficientFond: 1,
    rabatHautMm: 30,
    patteCollageMm: 20,
    margeDechetsPct: 10,
    actif: true,
    visiblePos: true,
    commentaire: '',
  },
  {
    typeSac: 'Sac personnalisé',
    formuleSurface: '(2L+2P+patte)×(H+rabat+fond)',
    coefficientFond: 0.85,
    rabatHautMm: 30,
    patteCollageMm: 20,
    margeDechetsPct: 10,
    actif: true,
    visiblePos: true,
    commentaire: '',
  },
];

export const DEFAULT_PAPER_BAG_ACCESSORIES: PaperBagAccessoryDefault[] = [
  { accessoire: 'Poignée cordelette', type: 'poignee', unite: 'sac', prixHt: 200 },
  { accessoire: 'Poignée papier torsadée', type: 'poignee', unite: 'sac', prixHt: 150 },
  { accessoire: 'Poignée plate', type: 'poignee', unite: 'sac', prixHt: 120 },
  { accessoire: 'Cordon', type: 'poignee', unite: 'sac', prixHt: 180 },
  { accessoire: 'Torsadées', type: 'poignee', unite: 'sac', prixHt: 150 },
  { accessoire: 'Plates', type: 'poignee', unite: 'sac', prixHt: 120 },
  { accessoire: 'Ruban', type: 'poignee', unite: 'sac', prixHt: 100 },
  { accessoire: 'Œillet métallique', type: 'oeillet', unite: 'piece', prixHt: 80 },
  { accessoire: 'Œillet plastique', type: 'oeillet', unite: 'piece', prixHt: 50 },
  { accessoire: 'Renfort carton', type: 'renfort', unite: 'sac', prixHt: 300 },
  { accessoire: 'Fond carton', type: 'renfort', unite: 'sac', prixHt: 250 },
];

let templates = DEFAULT_PAPER_BAG_TEMPLATES;
let margin = DEFAULT_PAPER_BAG_MARGIN;
let accessories = DEFAULT_PAPER_BAG_ACCESSORIES;

export function setPaperBagRuntime(opts: {
  templates?: PaperBagTemplateDefault[];
  margin?: PaperBagMarginDefault;
  accessories?: PaperBagAccessoryDefault[];
}) {
  if (opts.templates?.length) templates = opts.templates;
  if (opts.margin) margin = opts.margin;
  if (opts.accessories?.length) accessories = opts.accessories;
}

export function getPaperBagTemplates() {
  return templates;
}
export function getPaperBagMarginDefaults() {
  return margin;
}
export function getPaperBagAccessories() {
  return accessories;
}

export function findPaperBagTemplate(typeSac: string): PaperBagTemplateDefault | null {
  const t = String(typeSac ?? '').trim().toLowerCase();
  if (!t) return templates[0] ?? null;
  return (
    templates.find((x) => x.typeSac.toLowerCase() === t)
    ?? templates.find((x) => t.includes(x.typeSac.toLowerCase()) || x.typeSac.toLowerCase().includes(t))
    ?? templates[0]
    ?? null
  );
}

/**
 * Défauts Admin Packaging — gabarits, marges (source de vérité runtime avant DB).
 */
import type { BoxStructureKey } from '@/lib/packaging/box-calculation';
import type { PackagingArrondiMode } from '@/lib/packaging/packaging-a4-equivalence';

export type PackagingBoxTemplateDefault = {
  typeBoite: string;
  formuleKey: BoxStructureKey | 'closed_box_2faces' | 'custom_manual';
  formuleSurface: string;
  coeffRabats: number;
  coeffLanguettes: number;
  coeffCollage: number;
  margeDechetsPct: number;
  surfaceManuelleAllowed: boolean;
  actif: boolean;
  visiblePos: boolean;
  commentaire: string;
};

export type PackagingMarginDefaults = {
  scope: 'global';
  articleId: string | null;
  typeBoite: string | null;
  margeDechetsPct: number;
  beneficePct: number;
  margeDepensePct: number;
  arrondiMode: PackagingArrondiMode;
  actif: boolean;
  commentaire: string;
};

export const DEFAULT_PACKAGING_MARGIN: PackagingMarginDefaults = {
  scope: 'global',
  articleId: null,
  typeBoite: null,
  margeDechetsPct: 10,
  beneficePct: 30,
  margeDepensePct: 10,
  arrondiMode: 'exact',
  actif: true,
  commentaire: 'Défaut métier ANS — prixFinal = dépenses × 1,40',
};

export const DEFAULT_PACKAGING_TEMPLATES: PackagingBoxTemplateDefault[] = [
  {
    typeBoite: 'Boîte rabats droits',
    formuleKey: 'straight_tuck',
    formuleSurface: 'Développé STE : (2L+2P+G)×(H+2T)',
    coeffRabats: 1,
    coeffLanguettes: 1,
    coeffCollage: 1,
    margeDechetsPct: 10,
    surfaceManuelleAllowed: false,
    actif: true,
    visiblePos: true,
    commentaire: 'Boîte simple / rabats droits',
  },
  {
    typeBoite: 'Boîte rabats inversés',
    formuleKey: 'reverse_tuck',
    formuleSurface: 'Développé RTE',
    coeffRabats: 1,
    coeffLanguettes: 1,
    coeffCollage: 1,
    margeDechetsPct: 10,
    surfaceManuelleAllowed: false,
    actif: true,
    visiblePos: true,
    commentaire: '',
  },
  {
    typeBoite: 'Boîte fond automatique',
    formuleKey: 'auto_bottom',
    formuleSurface: 'Développé auto-bottom',
    coeffRabats: 1.05,
    coeffLanguettes: 1,
    coeffCollage: 1.1,
    margeDechetsPct: 10,
    surfaceManuelleAllowed: false,
    actif: true,
    visiblePos: true,
    commentaire: 'Collage obligatoire',
  },
  {
    typeBoite: 'Boîte fond 1-2-3',
    formuleKey: 'snap_lock',
    formuleSurface: 'Développé snap-lock',
    coeffRabats: 1,
    coeffLanguettes: 1,
    coeffCollage: 1,
    margeDechetsPct: 10,
    surfaceManuelleAllowed: false,
    actif: true,
    visiblePos: true,
    commentaire: '',
  },
  {
    typeBoite: 'Fourreau',
    formuleKey: 'sleeve',
    formuleSurface: 'Périmètre × longueur + rabats',
    coeffRabats: 1,
    coeffLanguettes: 1,
    coeffCollage: 1,
    margeDechetsPct: 10,
    surfaceManuelleAllowed: false,
    actif: true,
    visiblePos: true,
    commentaire: 'Boîte fourreau',
  },
  {
    typeBoite: 'Boîte tiroir',
    formuleKey: 'drawer_set',
    formuleSurface: 'Tiroir + fourreau',
    coeffRabats: 1,
    coeffLanguettes: 1,
    coeffCollage: 1.05,
    margeDechetsPct: 10,
    surfaceManuelleAllowed: false,
    actif: true,
    visiblePos: true,
    commentaire: '',
  },
  {
    typeBoite: 'Boîte fond + couvercle',
    formuleKey: 'lid_base',
    formuleSurface: 'Surface fond + surface couvercle',
    coeffRabats: 1,
    coeffLanguettes: 1,
    coeffCollage: 1,
    margeDechetsPct: 10,
    surfaceManuelleAllowed: false,
    actif: true,
    visiblePos: true,
    commentaire: '',
  },
  {
    typeBoite: 'Plateau ouvert',
    formuleKey: 'tray',
    formuleSurface: 'Tray développé',
    coeffRabats: 1,
    coeffLanguettes: 1,
    coeffCollage: 1,
    margeDechetsPct: 10,
    surfaceManuelleAllowed: false,
    actif: true,
    visiblePos: true,
    commentaire: '',
  },
  {
    typeBoite: 'Boîte oreiller',
    formuleKey: 'pillow',
    formuleSurface: 'Pillow × 1.15',
    coeffRabats: 1.15,
    coeffLanguettes: 1,
    coeffCollage: 1,
    margeDechetsPct: 10,
    surfaceManuelleAllowed: false,
    actif: true,
    visiblePos: true,
    commentaire: '',
  },
  {
    typeBoite: 'Boîte personnalisée',
    formuleKey: 'custom_manual',
    formuleSurface: '2(LP+LH+PH) × coefficients ou surface manuelle',
    coeffRabats: 1,
    coeffLanguettes: 1,
    coeffCollage: 1,
    margeDechetsPct: 10,
    surfaceManuelleAllowed: true,
    actif: true,
    visiblePos: true,
    commentaire: 'Gabarit libre / surface manuelle autorisée',
  },
  {
    typeBoite: 'Boîte simple',
    formuleKey: 'closed_box_2faces',
    formuleSurface: '2(LP+LH+PH)',
    coeffRabats: 1,
    coeffLanguettes: 1,
    coeffCollage: 1,
    margeDechetsPct: 10,
    surfaceManuelleAllowed: false,
    actif: true,
    visiblePos: true,
    commentaire: 'Surface théorique boîte fermée',
  },
];

/** Runtime overlays injectés depuis Admin (Prisma). */
let runtimeTemplates: PackagingBoxTemplateDefault[] | null = null;
let runtimeMargin: PackagingMarginDefaults | null = null;

export function setPackagingPricingRuntime(opts: {
  templates?: PackagingBoxTemplateDefault[];
  margin?: PackagingMarginDefaults;
}) {
  if (opts.templates?.length) runtimeTemplates = opts.templates;
  if (opts.margin) runtimeMargin = opts.margin;
}

export function getPackagingTemplates(): PackagingBoxTemplateDefault[] {
  return runtimeTemplates ?? DEFAULT_PACKAGING_TEMPLATES;
}

export function getPackagingMarginDefaults(): PackagingMarginDefaults {
  return runtimeMargin ?? DEFAULT_PACKAGING_MARGIN;
}

export function findPackagingTemplate(typeBoite: string): PackagingBoxTemplateDefault | undefined {
  const list = getPackagingTemplates();
  const direct = list.find((t) => t.typeBoite === typeBoite && t.actif);
  if (direct) return direct;
  const lower = typeBoite.trim().toLowerCase();
  return list.find((t) => t.typeBoite.toLowerCase() === lower && t.actif);
}

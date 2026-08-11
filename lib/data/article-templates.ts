import type { CalculationType } from '@/lib/pricing/config-to-dynamic-pricing';

export type ArticleTemplate = {
  id: string;
  label: string;
  family: string;
  calculationType: CalculationType;
  saleUnit: string;
  description: string;
  defaultVariables: string[];
  exampleArticleIds: string[];
};

/** Modèles d'articles recommandés (étape N) */
export const ARTICLE_TEMPLATES: ArticleTemplate[] = [
  {
    id: 'imprimerie-petit-format',
    label: 'Imprimerie petit format',
    saleUnit: 'pièce',
    family: 'imprimerie',
    calculationType: 'piece',
    description: 'Flyers, cartes, dépliants — dimensions mm, paliers quantité',
    defaultVariables: ['format', 'matiere', 'grammage', 'finition', 'quantite'],
    exampleArticleIds: ['fly-flyer', 'car-carte-visite'],
  },
  {
    id: 'grand-format',
    label: 'Grand format',
    saleUnit: 'm²',
    family: 'grand_format',
    calculationType: 'm2',
    description: 'Bâches, vinyles, panneaux — dimensions cm, surface m²',
    defaultVariables: ['largeur', 'hauteur', 'matiere', 'finition'],
    exampleArticleIds: ['gf-bache', 'gf-vinyle'],
  },
  {
    id: 'textile',
    label: 'Textile',
    saleUnit: 'pièce',
    family: 'textile',
    calculationType: 'piece',
    description: 'T-shirts, polos — tailles, couleurs, marquage',
    defaultVariables: ['taille', 'couleur', 'technique'],
    exampleArticleIds: ['tex-tshirt', 'tex-polo'],
  },
  {
    id: 'goodies',
    label: 'Goodies',
    saleUnit: 'pièce',
    family: 'goodies',
    calculationType: 'piece',
    description: 'Stylos, mugs, objets promotionnels',
    defaultVariables: ['couleur', 'marquage', 'quantite'],
    exampleArticleIds: ['goo-stylo', 'goo-mug'],
  },
  {
    id: 'signaletique',
    label: 'Signalétique',
    saleUnit: 'pièce',
    family: 'evenementiel',
    calculationType: 'piece',
    description: 'PLV, kakémonos, oriflammes',
    defaultVariables: ['format', 'structure', 'impression'],
    exampleArticleIds: ['plv-kakemono', 'evt-oriflamme'],
  },
  {
    id: 'reliure-finition',
    label: 'Reliure / finition',
    saleUnit: 'pièce',
    family: 'imprimerie',
    calculationType: 'formula',
    description: 'Brochures, livres, façonnage',
    defaultVariables: ['pages', 'reliure', 'couverture'],
    exampleArticleIds: ['bk-brochure', 'fin-livre'],
  },
  {
    id: 'evenementiel',
    label: 'Événementiel',
    saleUnit: 'pièce',
    family: 'evenementiel',
    calculationType: 'piece',
    description: 'Stands, roll-ups, kits événement',
    defaultVariables: ['format', 'options', 'quantite'],
    exampleArticleIds: ['evt-rollup', 'evt-stand'],
  },
];

export function getArticleTemplate(id: string) {
  return ARTICLE_TEMPLATES.find((t) => t.id === id) ?? null;
}

import { CATEGORIES } from '@/lib/data/catalogue';

/**
 * Accents familles POS — source unique pour nav catégories + cartes articles.
 * Toute couleur famille (label, compteur, CTA) doit passer par ici.
 */
export const POS_FAMILY_ACCENTS: Record<string, string> = {
  tous: '#155EEF',
  top: '#0086C9',
  recents: '#7A5AF8',
  favoris: '#D444F1',
  impression: '#E5484D',
  flyers: '#F04438',
  packaging: '#F79009',
  notes: '#B54708',
  carterie: '#B54708',
  calendrier: '#DC6803',
  grand_format: '#6938EF',
  plv: '#175CD3',
  photo: '#026AA2',
  evenementiel: '#C11574',
  event: '#C11574',
  textile: '#027A48',
  textiles: '#027A48',
  goodies: '#008F7A',
  conception: '#DC6803',
  finitions: '#93370D',
  livres: '#155EEF',
  document: '#475467',
  documents: '#475467',
};

const ACCENT_ALIASES: Record<string, string> = {
  'grand format': 'grand_format',
  'grand-format': 'grand_format',
  'grand format & pvc': 'grand_format',
  événementiel: 'evenementiel',
  evenementiel: 'evenementiel',
  événements: 'evenementiel',
  evenements: 'evenementiel',
  'bloc-note': 'notes',
  'bloc note': 'notes',
  'calendriers & marque-page': 'calendrier',
  'calendriers et marque-page': 'calendrier',
  'plv & chevalets': 'plv',
  'finitions & reliures': 'finitions',
  'packaging & boîtes': 'packaging',
  'packaging & boites': 'packaging',
  'livres, booklets, mémoires': 'livres',
  'documents administratifs': 'document',
  'conception graphique': 'conception',
  'impression sans finition': 'impression',
};

/** Libellés CATEGORIES → id (ex. "Bloc-note" → notes). */
const LABEL_TO_FAMILY_ID: Record<string, string> = Object.fromEntries(
  CATEGORIES.flatMap((c) => [
    [c.id, c.id],
    [c.label.toLocaleLowerCase('fr'), c.id],
  ]),
);

export const POS_FAMILY_GROUP: Record<string, string> = {
  tous: 'Accès rapide',
  favoris: 'Accès rapide',
  recents: 'Accès rapide',
  top: 'Accès rapide',
  packaging: 'Packaging',
  calendrier: 'Imprimés',
  notes: 'Imprimés',
  plv: 'Supports',
  livres: 'Imprimés',
  carterie: 'Imprimés',
  flyers: 'Imprimés',
  finitions: 'Façonnage',
  grand_format: 'Supports',
  textile: 'Textile',
  goodies: 'Goodies',
  evenementiel: 'Supports',
  photo: 'Photo',
  document: 'Documents',
  conception: 'Création',
  impression: 'Imprimés',
};

function normalizeFamilyId(categoryId: string | null | undefined): string {
  const raw = (categoryId ?? '').trim();
  if (!raw) return '';
  const key = raw.toLocaleLowerCase('fr');
  return (
    ACCENT_ALIASES[key] ??
    LABEL_TO_FAMILY_ID[key] ??
    key.replace(/\s+/g, '_')
  );
}

export function posFamilyAccent(categoryId: string | null | undefined, fallback = '#596273'): string {
  const id = normalizeFamilyId(categoryId);
  if (!id) return fallback;
  return POS_FAMILY_ACCENTS[id] ?? fallback;
}

export function posFamilyGroup(categoryId: string | null | undefined): string {
  const id = normalizeFamilyId(categoryId);
  return POS_FAMILY_GROUP[id] ?? 'Catalogue';
}

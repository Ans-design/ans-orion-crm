/**
 * Catégories DirectSale alignées sur la taxonomie POS officielle.
 * Les anciens ids (cartes, petit_format, grand_format_std…) restent acceptés via alias.
 */
import { CATEGORIES, CAT_LABELS } from '@/lib/data/catalogue';
import {
  canonicalFamilyLabel,
  normalizeCategoryId,
  suggestCorrectCategory,
} from '@/lib/pos/article-category-taxonomy';

/** Catégories principales — articles vente directe ANS ORION (ids = taxonomie POS). */
export const DIRECT_SALE_CATEGORIES = [
  { id: 'packaging', label: 'Packaging & Boîtes', examples: ['Doypack', 'Boîte', 'Hangtag'] },
  { id: 'plv', label: 'PLV & Chevalets', examples: ['Roll-up', 'X-Banner', 'Oriflamme', 'Stop trottoir', 'Chevalets'] },
  { id: 'grand_format', label: 'Grand Format & PVC', examples: ['Bâche', 'Vinyle', 'PVC rigide', 'Plexiglas'] },
  { id: 'carterie', label: 'Carterie', examples: ['Carte de visite', 'Carte fidélité', 'Jeux de cartes'] },
  { id: 'flyers', label: 'Flyers', examples: ['Flyers', 'Dépliants', 'Prospectus'] },
  { id: 'textile', label: 'Textiles', examples: ['T-shirts', 'Polos', 'Bob', 'Casquette', 'Tote bags'] },
  { id: 'goodies', label: 'Goodies', examples: ['Gobelet', 'Stylos', 'Mugs'] },
  { id: 'evenementiel', label: 'Événementiel', examples: ['Badges', 'Bracelets', 'Photocall'] },
  { id: 'photo', label: 'Photo', examples: ['Tirage photo', 'Cadre photo'] },
  { id: 'conception', label: 'Conception graphique', examples: ['Logo', 'Maquette', 'BAT'] },
  { id: 'impression', label: 'Impression sans finition', examples: ['PVC opaque A4', 'PVC translucide', 'Supports A4'] },
  { id: 'finitions', label: 'Finitions & Reliures', examples: [] },
] as const;

export type DirectSaleCategoryId = (typeof DIRECT_SALE_CATEGORIES)[number]['id'];

/** Alias legacy → id taxonomie POS (import Excel / anciennes lignes). */
export const DIRECT_SALE_CATEGORY_ALIASES: Record<string, string> = {
  packaging: 'packaging',
  goodies: 'goodies',
  plv: 'plv',
  'plv / signalétique': 'plv',
  'plv / signaletique': 'plv',
  grand_format_std: 'plv', // ancien id : contenait Roll-up / X-Banner à tort
  'grand format standard': 'plv',
  cartes: 'carterie',
  carte: 'carterie',
  carterie: 'carterie',
  petit_format: 'flyers',
  'impression petit format': 'flyers',
  textile: 'textile',
  textiles: 'textile',
  evenementiel: 'evenementiel',
  événementiel: 'evenementiel',
  photo: 'photo',
  design: 'conception',
  'design / conception graphique': 'conception',
  conception: 'conception',
  grand_format: 'grand_format',
  'grand format & pvc': 'grand_format',
  flyers: 'flyers',
  impression: 'impression',
  finitions: 'finitions',
};

export const DIRECT_SALE_STATUSES = ['draft', 'published', 'archived'] as const;
export type DirectSaleStatus = (typeof DIRECT_SALE_STATUSES)[number];

export function slugifyDirectSaleName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'article';
}

export function parseBoolExcel(val: unknown): boolean {
  const s = String(val ?? '').trim().toLowerCase();
  return s === 'oui' || s === 'yes' || s === 'true' || s === '1' || s === 'vrai';
}

export function normalizeDirectSaleStatus(raw: unknown): DirectSaleStatus {
  const s = String(raw ?? 'draft').trim().toLowerCase();
  if (s === 'publié' || s === 'publie' || s === 'published') return 'published';
  if (s === 'archivé' || s === 'archive' || s === 'archived') return 'archived';
  // « à compléter » / à configurer → brouillon (prix manquant), pas archivé
  if (
    s.includes('configurer') ||
    s.includes('compléter') ||
    s.includes('completer') ||
    s === 'a_completer' ||
    s === 'a_verifier' ||
    s === 'draft' ||
    s === 'brouillon'
  ) {
    return 'draft';
  }
  return 'draft';
}

/**
 * Normalise une catégorie DirectSale vers id POS + libellé canonique.
 * Priorité : suggestion par nom/référence > alias > normalizeCategoryId.
 */
export function normalizeDirectSaleCategory(input: {
  category?: string | null;
  name?: string | null;
  reference?: string | null;
}): { categoryId: string; categoryLabel: string } {
  const raw = (input.category ?? '').trim();
  const suggested = suggestCorrectCategory({
    articleId: input.reference,
    name: input.name,
    family: raw,
    category: raw,
  });
  // Si le nom donne un signal fort, l’utiliser
  if (input.name?.trim() || input.reference?.trim()) {
    return {
      categoryId: suggested,
      categoryLabel: canonicalFamilyLabel(suggested),
    };
  }
  const aliasKey = raw.toLowerCase();
  const fromAlias = DIRECT_SALE_CATEGORY_ALIASES[aliasKey];
  const id = fromAlias ?? normalizeCategoryId(raw) ?? suggested;
  return {
    categoryId: id,
    categoryLabel: CAT_LABELS[id] ?? canonicalFamilyLabel(id),
  };
}

/** Options select Admin — labels officiels POS. */
export function directSaleCategorySelectOptions() {
  return DIRECT_SALE_CATEGORIES.map((c) => ({
    id: c.id,
    label: CAT_LABELS[c.id] ?? c.label,
    examples: c.examples,
  }));
}

/** Vérifie qu’un id est une catégorie POS connue (ou alias). */
export function isKnownDirectSaleCategory(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  if (DIRECT_SALE_CATEGORIES.some((c) => c.id === raw)) return true;
  if (DIRECT_SALE_CATEGORY_ALIASES[raw.trim().toLowerCase()]) return true;
  if (normalizeCategoryId(raw)) return true;
  if (CATEGORIES.some((c) => c.label === raw)) return true;
  return false;
}

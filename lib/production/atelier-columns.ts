/** Colonnes atelier GPAO — helpers légers (sans React / framer). */

export const ATELIER_COLUMN_KEYS = [
  'nouvelle',
  'preparer',
  'design',
  'fichier',
  'impression',
  'finition',
  'qa',
  'pret_livraison',
  'livre',
  'bloque',
] as const;

export type AtelierColumnKey = (typeof ATELIER_COLUMN_KEYS)[number];

export function matchEtape(nom: string, patterns: string[]): boolean {
  const n = nom.toLowerCase();
  return patterns.some((p) => n.includes(p));
}

export const COLUMN_PATTERNS: Record<AtelierColumnKey, string[]> = {
  nouvelle: [],
  preparer: ['pao', 'préparation', 'preparation', 'préparer'],
  design: ['design', 'bat', 'validation', 'maquette'],
  fichier: ['fichier', 'pré-presse', 'pre-presse', 'rip'],
  impression: ['impression', 'offset', 'numérique', 'numerique'],
  finition: ['finition', 'découpe', 'decoupe', 'pliage', 'reliure'],
  qa: ['contrôle', 'controle', 'qualité', 'qualite', 'qa'],
  pret_livraison: ['emballage', 'expédition', 'expedition', 'livraison'],
  livre: [],
  bloque: [],
};

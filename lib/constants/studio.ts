export const BRIEF_STATUTS = [
  'Nouveau',
  'En cours',
  'En attente fichiers',
  'BAT envoyé',
  'Correction client',
  'Validé',
  'Livré production',
] as const;

export const VERSION_LABELS = ['V1', 'V2', 'V3', 'V4', 'V5'] as const;

export const VERSION_STATUTS = [
  'Brouillon',
  'En revue',
  'Envoyé',
  'Validé',
  'Correction demandée',
] as const;

export const FILE_CATEGORIES = ['source', 'logo', 'bat', 'print_ready', 'autre'] as const;

export const PREPRESS_CHECKLIST = [
  'Format / dimensions conformes',
  'Fond perdu (3–5 mm)',
  'Résolution images ≥ 300 dpi',
  'Mode couleur CMJN / Pantone validé',
  'Matière & finition compatibles',
  'Textes & orthographe relus',
  'Fichier PDF/X-1a ou prêt impression',
  'BAT client validé (si applicable)',
] as const;

export type BriefStatut = (typeof BRIEF_STATUTS)[number];

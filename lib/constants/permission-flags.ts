import type { PermissionFlags } from '@/lib/modules/types';

export const PERMISSION_MATRIX_COLUMNS: {
  key: keyof PermissionFlags;
  label: string;
  short: string;
}[] = [
  { key: 'canView', label: 'Voir', short: 'V' },
  { key: 'canCreate', label: 'Créer', short: 'C' },
  { key: 'canEdit', label: 'Modifier', short: 'M' },
  { key: 'canDelete', label: 'Supprimer', short: 'S' },
  { key: 'canValidate', label: 'Valider', short: 'Val' },
  { key: 'canExport', label: 'Exporter', short: 'Exp' },
  { key: 'canSeeFinance', label: 'Finance', short: 'Fin' },
  { key: 'canConfigure', label: 'Configurer', short: 'Cfg' },
  { key: 'canAccessAdmin', label: 'Admin', short: 'Adm' },
];

/** Rôles éditables dans la matrice (hors admin système) */
export const EDITABLE_ROLES = [
  'manager',
  'commercial',
  'caisse',
  'production',
  'livraison',
  'designer',
  'faconnage',
  'cm',
  'technicien',
  'accueil',
  'conducteur',
  'lecture',
  'demo',
] as const;

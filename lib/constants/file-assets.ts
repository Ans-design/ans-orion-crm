/** Extensions autorisées — étape 16 roadmap */
export const PRO_FILE_EXTENSIONS = new Set([
  'pdf', 'ai', 'psd', 'cdr', 'eps', 'png', 'jpg', 'jpeg', 'tiff', 'tif',
  'zip', 'rar', 'doc', 'docx', 'xls', 'xlsx',
  // svg retiré de l’allowlist upload (SEC-06) — legacy servi en attachment uniquement
]);

export const FILE_VERSION_LABELS = [
  'v1', 'v2', 'v3', 'final', 'final_corrige', 'print_ready',
] as const;

export const FILE_STATUTS = [
  'Reçu',
  'En vérification',
  'À corriger',
  'Validé BAT',
  'Prêt impression',
  'Archivé',
] as const;

/** Statuts BAT roadmap (étape 15) — compat anciens libellés conservés */
export const BAT_STATUTS = [
  'En attente fichier',
  'En attente',
  'En attente validation client',
  'Envoyé',
  'Correction demandée',
  'Validé',
  'Refusé',
  'Verrouillé',
] as const;

export type FileStatut = (typeof FILE_STATUTS)[number];
export type BatStatut = (typeof BAT_STATUTS)[number];

export function isAllowedProExtension(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return PRO_FILE_EXTENSIONS.has(ext);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function batStatutLabel(statut: string, locked?: boolean): string {
  if (locked && statut === 'Validé') return 'Validé · Verrouillé';
  const map: Record<string, string> = {
    'En attente': 'En attente validation client',
    Envoyé: 'En attente validation client',
  };
  return map[statut] ?? statut;
}

export function isBatPending(statut: string): boolean {
  return [
    'En attente',
    'En attente fichier',
    'En attente validation client',
    'Envoyé',
    'Correction demandée',
  ].includes(statut);
}

export function isBatValidated(statut: string): boolean {
  return statut === 'Validé' || statut === 'Verrouillé';
}

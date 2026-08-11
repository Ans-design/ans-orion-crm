/** Classes Tailwind pour badges de statut — palette ANS ORION */

export const STATUS_TONE = {
  neutral: 'bg-[var(--bg-chip)] text-[var(--neutral-badge-text)]',
  info: 'bg-[var(--info-bg)] text-[var(--info-text)]',
  success: 'bg-[var(--success-bg)] text-[var(--success-text)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning-text)]',
  danger: 'bg-[var(--danger-bg)] text-[var(--danger-text)]',
  progress: 'bg-[color-mix(in_srgb,var(--ans-pink-500)_12%,transparent)] text-[var(--primary-hover)]',
} as const;

/** Boutons d’action secondaire */
export const ACTION_INFO_CLASS =
  'bg-muted/80 text-muted-foreground hover:bg-accent hover:text-foreground';

export function statusBadgeClass(statut: string): string {
  const map: Record<string, string> = {
    'À planifier': STATUS_TONE.neutral,
    'En attente stock': STATUS_TONE.warning,
    'En production': STATUS_TONE.progress,
    'En finition': 'bg-[color-mix(in_srgb,var(--ans-plum-700)_12%,transparent)] text-[var(--ans-plum-700)] dark:text-[#D4A0C0]',
    'Prête': STATUS_TONE.progress,
    'Livré': STATUS_TONE.success,
    'Suspendu': 'bg-[color-mix(in_srgb,var(--ans-orange-500)_12%,transparent)] text-[var(--ans-orange-600)]',
    'Annulée': STATUS_TONE.danger,
    'Accepté': STATUS_TONE.success,
    'En attente': STATUS_TONE.warning,
    'Envoyé': STATUS_TONE.info,
    'Brouillon': STATUS_TONE.neutral,
    'Refusé': STATUS_TONE.danger,
    'Expiré': 'bg-[color-mix(in_srgb,var(--ans-orange-500)_12%,transparent)] text-[var(--ans-orange-600)]',
    'Émise': STATUS_TONE.info,
    'Payée': STATUS_TONE.success,
    'Partiellement payée': STATUS_TONE.warning,
    'En cours': STATUS_TONE.progress,
    'Terminé': STATUS_TONE.success,
    'Bloqué': STATUS_TONE.danger,
    'Préparation': STATUS_TONE.neutral,
    'Prêt': STATUS_TONE.warning,
    'En livraison': STATUS_TONE.info,
    'Retour': STATUS_TONE.danger,
    'En attente contrôle': STATUS_TONE.warning,
    'Conforme': STATUS_TONE.success,
    'Non conforme': STATUS_TONE.danger,
    'A refaire': 'bg-[color-mix(in_srgb,var(--ans-orange-500)_12%,transparent)] text-[var(--ans-orange-600)]',
    'Accepte avec reserve': 'bg-[color-mix(in_srgb,var(--ans-gold-500)_14%,transparent)] text-[var(--ans-orange-600)]',
    Archivé: STATUS_TONE.neutral,
    Annulé: STATUS_TONE.danger,
    'Non payé': STATUS_TONE.neutral,
    'Acompte reçu': STATUS_TONE.info,
    'En retard': STATUS_TONE.danger,
    'Actif': STATUS_TONE.success,
    'Prospect': STATUS_TONE.info,
    'Virement': STATUS_TONE.info,
    'Commandé': STATUS_TONE.info,
    'Normale': STATUS_TONE.info,
    affecte: STATUS_TONE.info,
    running: STATUS_TONE.progress,
    'Planifié': STATUS_TONE.info,
    'À faire': STATUS_TONE.neutral,
    'Sauté': 'bg-[color-mix(in_srgb,var(--ans-orange-500)_12%,transparent)] text-[var(--ans-orange-600)]',
  };
  return map[statut] ?? STATUS_TONE.neutral;
}

export const AUDIT_ACTION_BADGE: Record<string, string> = {
  CREATE: STATUS_TONE.success,
  UPDATE: STATUS_TONE.info,
  DELETE: STATUS_TONE.danger,
  STATUS_CHANGE: STATUS_TONE.warning,
  ACCEPT: 'bg-primary/10 text-primary',
  LOGIN: 'bg-[color-mix(in_srgb,var(--ans-plum-700)_12%,transparent)] text-[var(--ans-plum-700)] dark:text-[#D4A0C0]',
  LOGIN_FAILED: STATUS_TONE.danger,
  PASSWORD_RESET_REQUEST: 'bg-[color-mix(in_srgb,var(--ans-gold-500)_14%,transparent)] text-[var(--ans-orange-600)]',
  MERGE: 'bg-[color-mix(in_srgb,var(--ans-plum-700)_12%,transparent)] text-[var(--ans-plum-700)] dark:text-[#D4A0C0]',
  EXPORT: STATUS_TONE.progress,
  ARCHIVE: 'bg-[color-mix(in_srgb,var(--ans-orange-500)_12%,transparent)] text-[var(--ans-orange-600)]',
};

export const AUDIT_ENTITY_COLOR: Record<string, string> = {
  Client: 'text-[var(--ans-gold-500)]',
  Devis: 'text-primary',
  Commande: 'text-[var(--ans-orange-500)]',
  Production: 'text-[var(--ans-pink-500)]',
  Facture: 'text-[var(--ans-gold-500)]',
  Paiement: 'text-[var(--success)]',
  Livraison: 'text-primary',
  Tarif: 'text-[var(--ans-plum-700)] dark:text-[#D4A0C0]',
};

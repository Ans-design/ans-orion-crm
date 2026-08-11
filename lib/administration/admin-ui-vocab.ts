/**
 * Vocabulaire unique Administration — libellés stables (UX Phase 22).
 * À réutiliser dans headers, boutons et empty states plutôt que des synonymes libres.
 */

export const ADMIN_UI = {
  save: 'Enregistrer',
  saveDraft: 'Enregistrer',
  publish: 'Activer',
  unpublish: 'Archiver',
  archive: 'Archiver',
  restore: 'Restaurer',
  deletePermanent: 'Supprimer définitivement',
  duplicate: 'Dupliquer',
  preview: 'Simuler',
  trash: 'Corbeille',
  activeList: 'Actifs',
  import: 'Importer',
  export: 'Exporter',
  syncPos: 'Synchroniser Admin → POS',
  create: 'Créer',
  cancel: 'Annuler',
  confirm: 'Confirmer',
  leaveWithoutSave: 'Quitter sans enregistrer',
  unsavedChangesTitle: 'Modifications non enregistrées',
  unsavedChangesBody:
    'Des changements de paliers ou de formule ne sont pas encore enregistrés. Voulez-vous quitter cette fiche ?',
  clearFilters: 'Tout effacer',
  status: {
    draft: 'À corriger',
    published: 'Actif',
    archived: 'Archivé',
    active: 'Actif',
    incomplete: 'À corriger',
    posVisible: 'Actif',
    posHidden: 'Masqué',
    tariffPublished: 'Version tarifaire active',
    tariffDraft: 'Version tarifaire en cours',
  },
} as const;

export type AdminUiStatusKey = keyof typeof ADMIN_UI.status;

/**
 * Libellé FR unique pour un statut de publication / profil.
 * Remplace les synonymes « Publié », « draft », etc.
 */
export function adminStatusLabel(status: string | null | undefined): string {
  const s = String(status ?? '').toLowerCase().trim();
  switch (s) {
    case 'published':
    case 'active':
    case 'synced':
    case 'pos_visible':
      return ADMIN_UI.status.published;
    case 'draft':
    case 'incomplete':
    case 'pending':
      return ADMIN_UI.status.draft;
    case 'archived':
    case 'inactive':
    case 'unpublished':
      return ADMIN_UI.status.archived;
    case 'catalogue':
      return 'Catalogue';
    default:
      return status?.trim() || '—';
  }
}

/** Libellé filtre pluriel (ex. select « Actifs »). */
export function adminStatusFilterLabel(status: 'published' | 'draft' | 'archived' | 'all'): string {
  if (status === 'all') return 'Tous';
  if (status === 'published') return 'Actifs';
  if (status === 'draft') return 'À corriger';
  return 'Archivés';
}

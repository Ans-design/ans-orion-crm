import type { PermissionFlags } from './types';
import { MODULE_REGISTRY } from './module-registry';

/** Défaut fail-closed pour rôles ops (whitelist explicite dans PERMISSION_MATRIX). */
export const DEFAULT_PERMISSION_FLAGS: PermissionFlags = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canValidate: false,
  canAssign: false,
  canExport: false,
  canOverridePrice: false,
  canCloseTask: false,
  canSeeFinance: false,
  canSeeAllBranches: false,
  canConfigure: false,
  canAccessAdmin: false,
};

const OPS_FAIL_CLOSED = new Set([
  'commercial',
  'production',
  'livraison',
  'designer',
  'caisse',
  'faconnage',
  'cm',
  'technicien',
  'accueil',
  'conducteur',
]);

const ADMIN_FLAGS: PermissionFlags = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canValidate: true,
  canAssign: true,
  canExport: true,
  canOverridePrice: true,
  canCloseTask: true,
  canSeeFinance: true,
  canSeeAllBranches: true,
  canConfigure: true,
  canAccessAdmin: true,
};

/** moduleId → flags par rôle auth (squelette extensible) */
export const PERMISSION_MATRIX: Record<string, Record<string, Partial<PermissionFlags>>> = {
  admin: Object.fromEntries(
    Object.keys(MODULE_REGISTRY).map((id) => [id, ADMIN_FLAGS]),
  ),
  manager: Object.fromEntries(
    Object.keys(MODULE_REGISTRY).map((id) => [id, { ...ADMIN_FLAGS, canDelete: false, canConfigure: false }]),
  ),
  commercial: {
    clients: { canView: true, canCreate: true, canEdit: true, canExport: false },
    devis: { canView: true, canCreate: true, canEdit: true, canValidate: true },
    commandes: { canView: true, canCreate: true, canEdit: true },
    pos: { canView: true, canCreate: true, canOverridePrice: true },
    panier: { canView: true, canCreate: true },
    factures: { canView: true },
    livraisons: { canView: true },
    cm_relances: { canView: true },
    cm_campagnes: { canView: true },
    equipe_taches: { canView: true },
    rh_mon_profil: { canView: true },
    rh_absences: { canView: true, canCreate: true },
    equipe_messages: { canView: true, canCreate: true },
    equipe_suggestions: { canView: true, canCreate: true },
    historique: { canView: true },
    ws_commercial: { canView: true },
  },
  production: {
    production: { canView: true, canEdit: true, canCloseTask: true },
    planning: { canView: true, canEdit: true },
    commandes: { canView: true, canEdit: true },
    bat: { canView: true, canEdit: true },
    machines: { canView: true },
    stock: { canView: true, canEdit: true },
    equipe_taches: { canView: true, canEdit: true, canCloseTask: true },
    rh_mon_profil: { canView: true },
    rh_absences: { canView: true, canCreate: true },
    gpao_dossiers: { canView: true },
    studio_hub: { canView: true },
    studio_briefs: { canView: true },
    studio_fichiers: { canView: true },
    ws_production: { canView: true },
    ws_magasin: { canView: true },
    equipe_messages: { canView: true, canCreate: true },
    equipe_suggestions: { canView: true, canCreate: true },
  },
  livraison: {
    livraisons: { canView: true, canEdit: true, canCloseTask: true },
    commandes: { canView: true },
    clients: { canView: true },
    paiements: { canView: true, canCreate: true },
    equipe_taches: { canView: true },
    rh_mon_profil: { canView: true },
    rh_absences: { canView: true, canCreate: true },
    ws_logistique: { canView: true },
    equipe_messages: { canView: true, canCreate: true },
    equipe_suggestions: { canView: true, canCreate: true },
  },
  designer: {
    bat: { canView: true, canCreate: true, canEdit: true, canValidate: true },
    conception: { canView: true, canCreate: true, canEdit: true },
    clients: { canView: true },
    commandes: { canView: true },
    equipe_taches: { canView: true, canEdit: true, canCloseTask: true },
    studio_hub: { canView: true, canEdit: true },
    studio_briefs: { canView: true },
    studio_fichiers: { canView: true },
    prepresse: { canView: true },
    rh_mon_profil: { canView: true },
    rh_absences: { canView: true, canCreate: true },
    ws_studio: { canView: true },
    equipe_messages: { canView: true, canCreate: true },
    equipe_suggestions: { canView: true, canCreate: true },
  },
  caisse: {
    caisse: { canView: true, canCreate: true, canEdit: true, canSeeFinance: true },
    factures: { canView: true, canCreate: true, canEdit: true, canSeeFinance: true },
    paiements: { canView: true, canCreate: true, canSeeFinance: true },
    ws_finance: { canView: true },
    rh_mon_profil: { canView: true },
    equipe_messages: { canView: true, canCreate: true },
    equipe_suggestions: { canView: true, canCreate: true },
  },
  faconnage: {
    ws_faconnage: { canView: true, canEdit: true, canCloseTask: true },
    machines: { canView: true },
    stock: { canView: true },
    plan_matiere: { canView: true, canCreate: true },
    equipe_taches: { canView: true, canEdit: true, canCloseTask: true },
    rh_mon_profil: { canView: true },
    equipe_messages: { canView: true, canCreate: true },
    equipe_suggestions: { canView: true, canCreate: true },
  },
  cm: {
    ws_cm: { canView: true, canCreate: true, canEdit: true },
    commandes: { canView: true, canCreate: true, canEdit: true },
    clients: { canView: true, canCreate: true, canEdit: true },
    cm_notifications: { canView: true, canCreate: true },
    cm_campagnes: { canView: true, canCreate: true },
    cm_relances: { canView: true, canCreate: true },
    rh_mon_profil: { canView: true },
    equipe_messages: { canView: true, canCreate: true },
    equipe_suggestions: { canView: true, canCreate: true },
  },
  technicien: {
    ws_maintenance: { canView: true, canEdit: true },
    maintenance_tickets: { canView: true, canEdit: true },
    materiels: { canView: true, canEdit: true },
    machines: { canView: true, canEdit: true },
    stock: { canView: true },
    planning: { canView: true },
    equipe_taches: { canView: true, canEdit: true, canCloseTask: true },
    rh_mon_profil: { canView: true },
    equipe_messages: { canView: true, canCreate: true },
    equipe_suggestions: { canView: true, canCreate: true },
  },
  accueil: {
    ws_accueil: { canView: true, canEdit: true },
    clients: { canView: true, canCreate: true },
    commandes: { canView: true },
    devis: { canView: true, canCreate: true },
    livraisons: { canView: true },
    rh_mon_profil: { canView: true },
    equipe_messages: { canView: true, canCreate: true },
    equipe_suggestions: { canView: true, canCreate: true },
  },
  conducteur: {
    ws_conducteur: { canView: true, canEdit: true },
    machines: { canView: true },
    planning: { canView: true, canEdit: true },
    commandes: { canView: true, canEdit: true },
    bat: { canView: true },
    equipe_taches: { canView: true, canEdit: true, canCloseTask: true },
    plan_matiere: { canView: true, canCreate: true },
    stock: { canView: true },
    maintenance_tickets: { canView: true, canCreate: true },
    rh_mon_profil: { canView: true },
    equipe_messages: { canView: true, canCreate: true },
    equipe_suggestions: { canView: true, canCreate: true },
  },
  lecture: Object.fromEntries(
    Object.keys(MODULE_REGISTRY).map((id) => [id, { canView: true, canCreate: false, canEdit: false }]),
  ),
};

export function getModulePermissions(
  authRole: string,
  moduleId: string,
  roleOverride?: Partial<PermissionFlags>,
  userOverride?: Partial<PermissionFlags>,
): PermissionFlags {
  if (authRole === 'admin') return { ...ADMIN_FLAGS, ...(userOverride ?? {}) };
  const base = PERMISSION_MATRIX[authRole]?.[moduleId]
    ?? PERMISSION_MATRIX[authRole]?.['*']
    ?? {};
  const defaults = OPS_FAIL_CLOSED.has(authRole)
    ? DEFAULT_PERMISSION_FLAGS
    : { ...DEFAULT_PERMISSION_FLAGS, canView: true, canCreate: true, canEdit: true };
  return { ...defaults, ...base, ...(roleOverride ?? {}), ...(userOverride ?? {}) };
}

export function canViewModule(
  authRole: string,
  moduleId: string,
  roleOverride?: Partial<PermissionFlags>,
  userOverride?: Partial<PermissionFlags>,
): boolean {
  return getModulePermissions(authRole, moduleId, roleOverride, userOverride).canView;
}

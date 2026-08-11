/** Modules workspace affichés sous « Mon espace » par profil sidebar. */
export const MON_ESPACE_BY_PROFILE: Record<string, string[]> = {
  director: [
    'ws_accueil',
    'ws_commercial',
    'ws_production',
    'ws_studio',
    'ws_finance',
    'ws_cm',
    'ws_logistique',
    'ws_magasin',
    'ws_faconnage',
    'ws_conducteur',
    'ws_maintenance',
    'rh_mon_profil',
  ],
  commercial: ['ws_commercial', 'rh_mon_profil'],
  graphiste: ['ws_studio', 'rh_mon_profil'],
  operateur: ['ws_production', 'ws_magasin', 'rh_mon_profil'],
  logistique: ['ws_logistique', 'rh_mon_profil'],
  faconnage: ['ws_faconnage', 'rh_mon_profil'],
  cm_social: ['ws_cm', 'rh_mon_profil'],
  technicien: ['ws_maintenance', 'rh_mon_profil'],
  finance: ['ws_finance', 'rh_mon_profil'],
  accueil: ['ws_accueil', 'rh_mon_profil'],
  conducteur: ['ws_conducteur', 'rh_mon_profil'],
  lecture: ['rh_mon_profil'],
};

const WS_MODULE_PREFIX = 'ws_';

export function getMonEspaceModuleIds(profileId: string): string[] {
  return MON_ESPACE_BY_PROFILE[profileId] ?? ['rh_mon_profil'];
}

export function isMonEspaceModule(moduleId: string): boolean {
  return moduleId.startsWith(WS_MODULE_PREFIX) || moduleId === 'rh_mon_profil';
}

/** Retire les doublons ws_* / rh_mon_profil hors section Mon espace. */
export function shouldSkipDuplicateWorkspaceLink(
  profileId: string,
  moduleId: string,
  inMonEspaceSection: boolean,
): boolean {
  if (!isMonEspaceModule(moduleId)) return false;
  if (inMonEspaceSection) return false;
  const allowed = getMonEspaceModuleIds(profileId);
  return allowed.includes(moduleId);
}

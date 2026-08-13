/**
 * Contrôle d'accès aux pages (complément middleware + sidebar).
 * Les APIs restent protégées par requirePermission côté serveur.
 */

import { getHomeRouteForRole } from '@/lib/modules/role-registry';

export type PageAccessRule = {
  /** Préfixe de route (exact ou parent) */
  path: string;
  /** Rôles autorisés — vide = tous les utilisateurs connectés */
  roles: string[];
};

/** Rôles lecture factures/paiements (hub commande) — écritures gated API + UI */
const FINANCE_READ_PAGE_ROLES = [
  'admin', 'manager', 'finance', 'caisse', 'commercial', 'demo', 'cm', 'accueil',
];
/** Write métier finance (hors lecture hub) — fiscalité / coûts restent admin|manager|finance */
const FINANCE_WRITE_PAGE_ROLES = ['admin', 'manager', 'finance', 'caisse', 'demo'];
const POS_PAGE_ROLES = ['admin', 'manager', 'commercial', 'caisse', 'finance', 'designer', 'cm', 'demo', 'user'];

/** Routes sensibles — ordre : chemins les plus longs en premier pour le matching */
export const PAGE_ACCESS_RULES: PageAccessRule[] = [
  { path: '/admin/vue', roles: ['admin', 'manager'] },
  { path: '/admin-control', roles: ['admin', 'manager'] },
  { path: '/admin', roles: ['admin', 'manager'] },
  /** Pilotage direction — lecture = consultation ; commercial → workspace (pas cockpit) */
  { path: '/dashboard', roles: ['admin', 'manager', 'demo', 'finance', 'lecture'] },
  { path: '/operations', roles: ['admin', 'manager', 'production', 'livraison', 'designer'] },
  { path: '/admin/permissions', roles: ['admin', 'manager'] },
  { path: '/admin/ticker', roles: ['admin', 'manager'] },
  { path: '/admin/annexes', roles: ['admin', 'manager'] },
  { path: '/parametres/configuration', roles: ['admin', 'manager'] },
  { path: '/admin/pricing', roles: ['admin', 'manager'] },
  { path: '/administration', roles: ['admin', 'manager'] },
  { path: '/tarifs', roles: ['admin', 'manager'] },
  { path: '/finance/fiscalite', roles: ['admin', 'manager', 'finance'] },
  { path: '/finance/charges', roles: ['admin', 'manager', 'finance'] },
  { path: '/finance/couts-revient', roles: ['admin', 'manager', 'finance'] },
  { path: '/finance/ventes-directes', roles: ['admin', 'manager', 'finance'] },
  { path: '/finance/paiements', roles: FINANCE_READ_PAGE_ROLES },
  { path: '/finance/factures', roles: FINANCE_READ_PAGE_ROLES },
  { path: '/paiements', roles: FINANCE_READ_PAGE_ROLES },
  { path: '/factures', roles: FINANCE_READ_PAGE_ROLES },
  { path: '/pos', roles: POS_PAGE_ROLES },
  { path: '/studio', roles: ['admin', 'manager', 'designer', 'production', 'commercial', 'conducteur', 'faconnage'] },
  { path: '/bat', roles: ['admin', 'manager', 'designer', 'production', 'commercial', 'conducteur', 'faconnage'] },
  { path: '/machines', roles: ['admin', 'manager', 'production', 'conducteur', 'technicien', 'faconnage'] },
  { path: '/rapports/performance', roles: ['admin', 'manager', 'production'] },
  { path: '/rapports', roles: ['admin', 'manager'] },
  { path: '/parametres/securite', roles: ['admin', 'manager'] },
  { path: '/parametres/donnees', roles: ['admin', 'manager'] },
  /** Self-service RH — avant catch-all /rh */
  { path: '/rh/mon-profil', roles: [] },
  { path: '/rh/paie', roles: ['admin'] },
  { path: '/rh/employes', roles: ['admin', 'manager'] },
  { path: '/rh/recrutement', roles: ['admin', 'manager'] },
  /** Absences : self + RH (API distingue self vs approbation) */
  { path: '/rh/absences', roles: [] },
  { path: '/rh/performance', roles: ['admin', 'manager'] },
  { path: '/rh/annonces', roles: ['admin', 'manager'] },
  { path: '/rh/equipements', roles: ['admin', 'manager'] },
  { path: '/rh', roles: ['admin', 'manager'] },
  { path: '/stock', roles: ['admin', 'manager', 'production', 'technicien', 'conducteur', 'faconnage'] },
  { path: '/achats', roles: ['admin', 'manager', 'technicien'] },
  { path: '/fournisseurs', roles: ['admin', 'manager', 'technicien'] },
  { path: '/production/qualite', roles: ['admin', 'manager', 'production', 'conducteur'] },
  { path: '/production/dechets', roles: ['admin', 'manager', 'production', 'faconnage', 'conducteur'] },
  { path: '/production/dossiers', roles: ['admin', 'manager', 'production', 'designer', 'conducteur', 'faconnage'] },
  { path: '/production', roles: ['admin', 'manager', 'production', 'designer', 'conducteur', 'faconnage', 'technicien'] },
  { path: '/planning', roles: ['admin', 'manager', 'production', 'conducteur', 'faconnage', 'technicien'] },
  { path: '/equipe/taches', roles: ['admin', 'manager', 'production', 'conducteur', 'faconnage', 'designer', 'commercial', 'livraison', 'cm', 'accueil', 'finance', 'caisse', 'technicien'] },
  { path: '/livraisons', roles: ['admin', 'manager', 'livraison', 'commercial', 'cm', 'accueil', 'finance', 'caisse', 'production', 'conducteur'] },
  /** Relances clients — commercial (avant catch-all /cm réservé CM) */
  { path: '/cm/relances', roles: ['admin', 'manager', 'cm', 'commercial'] },
  { path: '/cm/campagnes', roles: ['admin', 'manager', 'cm', 'commercial'] },
  { path: '/cm/notifications', roles: ['admin', 'manager', 'cm', 'commercial'] },
  { path: '/cm', roles: ['admin', 'manager', 'cm'] },
  { path: '/caisse', roles: ['admin', 'manager', 'caisse', 'finance'] },
  { path: '/messagerie', roles: ['admin', 'manager', 'commercial', 'production', 'designer', 'cm', 'livraison', 'caisse', 'finance', 'accueil', 'technicien', 'conducteur', 'faconnage', 'demo', 'user', 'lecture'] },
  { path: '/historique', roles: ['admin', 'manager'] },
];

export function getPageAccessRoles(pathname: string): string[] | null {
  const normalized = pathname.split('?')[0];
  for (const rule of PAGE_ACCESS_RULES) {
    if (normalized === rule.path || normalized.startsWith(`${rule.path}/`)) {
      return rule.roles;
    }
  }
  return null;
}

/** FIN-ACCESS-01 — création / mutation factures-paiements (UI) */
export function canAccessFinanceWritePage(role: string): boolean {
  if (role === 'admin') return true;
  return FINANCE_WRITE_PAGE_ROLES.includes(role);
}

export function canAccessPage(role: string, pathname: string): boolean {
  if (role === 'admin') return true;
  const allowed = getPageAccessRoles(pathname);
  if (!allowed) return true;
  /** roles: [] = tout utilisateur authentifié (self-service) */
  if (allowed.length === 0) return true;
  return allowed.includes(role);
}

/** Redirection /non-autorise si le rôle n'a pas accès — null si OK. */
export function getUnauthorizedPageRedirect(pathname: string, role: string): string | null {
  if (pathname.startsWith('/non-autorise')) return null;
  if (canAccessPage(role, pathname)) return null;
  const qs = new URLSearchParams({ from: pathname });
  return `/non-autorise?${qs.toString()}`;
}

export function getDefaultRedirectForRole(role: string): string {
  return getHomeRouteForRole(role);
}

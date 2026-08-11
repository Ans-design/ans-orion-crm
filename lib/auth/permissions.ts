/** Rôles CRM — audit ANS ORION */
export const ROLES = ['admin', 'manager', 'commercial', 'caisse', 'finance', 'production', 'livraison', 'designer', 'faconnage', 'cm', 'technicien', 'accueil', 'conducteur', 'lecture', 'demo'] as const;
export type Role = (typeof ROLES)[number] | 'user';

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  manager: 'Direction / Manager',
  commercial: 'Commercial',
  caisse: 'Caisse / Comptabilité',
  finance: 'Finance / Comptabilité',
  production: 'Production',
  livraison: 'Livraison',
  designer: 'Designer / Conception',
  faconnage: 'Façonnage',
  cm: 'Community Manager',
  technicien: 'Technicien maintenance',
  accueil: 'Agent d\'accueil',
  conducteur: 'Conducteur machine',
  lecture: 'Lecture seule',
  demo: 'Compte démo',
  user: 'Utilisateur',
};

export type Permission =
  | 'clients:read' | 'clients:write'
  | 'devis:read' | 'devis:write' | 'devis:accept'
  | 'commandes:read' | 'commandes:write'
  | 'factures:read' | 'factures:write'
  | 'paiements:read' | 'paiements:write'
  | 'livraisons:read' | 'livraisons:write'
  | 'production:read' | 'production:write'
  | 'stock:read' | 'stock:write'
  | 'bat:read' | 'bat:write'
  | 'fournisseurs:read' | 'fournisseurs:write'
  | 'achats:read' | 'achats:write'
  | 'planning:read' | 'planning:write'
  | 'rapports:read' | 'rapports:export'
  | 'tarifs:read' | 'tarifs:write'
  | 'regles:read' | 'regles:write'
  | 'pos:use'
  | 'pos:force_price' | 'pos:discount_high' | 'pos:cancel_payment' | 'pos:delete_order'
  | 'pos:stock_edit' | 'pos:view_margin' | 'pos:close_register' | 'pos:export_register'
  | 'pos:promo_edit' | 'pos:validate_debt'
  | 'import:run' | 'export:run'
  | 'audit:read'
  | 'users:manage'
  | 'settings:write'
  | 'config:view' | 'config:edit_chips' | 'config:edit_price' | 'config:edit_features'
  | 'config:publish' | 'config:rollback' | 'config:test'
  | 'config:export' | 'config:import' | 'config:audit_read'
  | 'cm:read' | 'cm:write'
  | 'finance:read' | 'finance:write'
  | 'rh:read' | 'rh:write' | 'rh:payroll_read' | 'rh:payroll_write';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ['clients:read', 'clients:write', 'devis:read', 'devis:write', 'devis:accept', 'commandes:read', 'commandes:write', 'factures:read', 'factures:write', 'paiements:read', 'paiements:write', 'livraisons:read', 'livraisons:write', 'production:read', 'production:write', 'stock:read', 'stock:write', 'bat:read', 'bat:write', 'fournisseurs:read', 'fournisseurs:write', 'achats:read', 'achats:write', 'planning:read', 'planning:write', 'rapports:read', 'rapports:export', 'tarifs:read', 'tarifs:write', 'regles:read', 'regles:write', 'pos:use', 'pos:force_price', 'pos:discount_high', 'pos:cancel_payment', 'pos:delete_order', 'pos:stock_edit', 'pos:view_margin', 'pos:close_register', 'pos:export_register', 'pos:promo_edit', 'pos:validate_debt', 'import:run', 'export:run', 'audit:read', 'users:manage', 'settings:write', 'config:view', 'config:edit_chips', 'config:edit_price', 'config:edit_features', 'config:publish', 'config:rollback', 'config:test', 'config:export', 'config:import', 'config:audit_read', 'cm:read', 'cm:write', 'finance:read', 'finance:write', 'rh:read', 'rh:write', 'rh:payroll_read', 'rh:payroll_write'],
  manager: ['clients:read', 'clients:write', 'devis:read', 'devis:write', 'devis:accept', 'commandes:read', 'commandes:write', 'factures:read', 'factures:write', 'paiements:read', 'paiements:write', 'livraisons:read', 'livraisons:write', 'production:read', 'production:write', 'stock:read', 'stock:write', 'bat:read', 'bat:write', 'fournisseurs:read', 'fournisseurs:write', 'achats:read', 'achats:write', 'planning:read', 'planning:write', 'rapports:read', 'rapports:export', 'tarifs:read', 'tarifs:write', 'regles:read', 'regles:write', 'pos:use', 'pos:force_price', 'pos:discount_high', 'pos:cancel_payment', 'pos:delete_order', 'pos:view_margin', 'pos:close_register', 'pos:export_register', 'pos:promo_edit', 'pos:validate_debt', 'export:run', 'audit:read', 'users:manage', 'settings:write', 'config:view', 'config:test', 'config:audit_read', 'cm:read', 'cm:write', 'finance:read', 'finance:write', 'rh:read', 'rh:write'],
  commercial: ['clients:read', 'clients:write', 'devis:read', 'devis:write', 'devis:accept', 'commandes:read', 'commandes:write', 'factures:read', 'livraisons:read', 'production:read', 'tarifs:read', 'regles:read', 'pos:use'],
  caisse: ['clients:read', 'devis:read', 'commandes:read', 'factures:read', 'factures:write', 'paiements:read', 'paiements:write', 'livraisons:read', 'tarifs:read', 'pos:use', 'pos:close_register', 'pos:validate_debt', 'finance:read'],
  finance: ['clients:read', 'devis:read', 'commandes:read', 'factures:read', 'factures:write', 'paiements:read', 'paiements:write', 'livraisons:read', 'tarifs:read', 'rapports:read', 'rapports:export', 'export:run', 'audit:read', 'pos:use', 'pos:view_margin', 'pos:close_register', 'pos:validate_debt', 'finance:read', 'finance:write'],
  production: ['commandes:read', 'commandes:write', 'production:read', 'production:write', 'livraisons:read', 'tarifs:read', 'regles:read', 'stock:read', 'stock:write', 'bat:read', 'bat:write', 'planning:read', 'planning:write'],
  livraison: ['commandes:read', 'livraisons:read', 'livraisons:write', 'factures:read', 'clients:read'],
  designer: ['clients:read', 'devis:read', 'devis:write', 'commandes:read', 'production:read', 'tarifs:read', 'regles:read', 'pos:use', 'bat:read', 'bat:write'],
  faconnage: ['commandes:read', 'production:read', 'production:write', 'stock:read', 'planning:read', 'bat:read'],
  cm: ['clients:read', 'clients:write', 'devis:read', 'devis:write', 'commandes:read', 'commandes:write', 'livraisons:read', 'factures:read', 'tarifs:read', 'pos:use', 'cm:read', 'cm:write'],
  technicien: ['production:read', 'production:write', 'stock:read', 'planning:read', 'fournisseurs:read', 'achats:read'],
  accueil: ['clients:read', 'clients:write', 'devis:read', 'devis:write', 'commandes:read', 'livraisons:read', 'factures:read'],
  conducteur: ['commandes:read', 'commandes:write', 'production:read', 'production:write', 'stock:read', 'bat:read', 'planning:read', 'planning:write', 'livraisons:read'],
  lecture: ['clients:read', 'devis:read', 'commandes:read', 'factures:read', 'paiements:read', 'livraisons:read', 'production:read', 'tarifs:read', 'regles:read', 'audit:read'],
  /** Démo : CRM léger uniquement — pas d’écritures finance / stock / production / admin. */
  demo: [
    'clients:read', 'clients:write',
    'devis:read', 'devis:write',
    'commandes:read',
    'factures:read',
    'paiements:read',
    'livraisons:read',
    'production:read',
    'stock:read',
    'tarifs:read',
    'regles:read',
    'pos:use',
  ],
  user: ['clients:read', 'devis:read', 'commandes:read', 'factures:read', 'paiements:read', 'livraisons:read', 'production:read', 'tarifs:read', 'regles:read', 'pos:use'],
};

export function hasPermission(role: string, permission: Permission): boolean {
  if (role === 'admin') return true;
  const perms = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.user;
  return perms.includes(permission);
}

export function isReadOnlyRole(role: string): boolean {
  return role === 'lecture';
}

/** Routes interdites au compte démo (audit sécurité §2) */
export const DEMO_BLOCKED_PREFIXES = [
  '/api/export',
  '/api/import',
  '/api/users',
  '/api/settings',
  '/api/signup',
  '/api/setup-db',
  '/api/caisse',
  '/api/admin/users',
  '/api/admin-backoffice',
  '/api/regles',
  '/api/tarifs',
  '/api/admin-config',
];

export function isDemoRole(role: string): boolean {
  return role === 'demo';
}

export function isFullAccessRole(role: string): boolean {
  return role === 'admin' || role === 'manager';
}

export function isDemoBlockedRoute(pathname: string, method: string, role?: string): boolean {
  if (role === 'admin' || role === 'manager') return false;
  if (DEMO_BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname.startsWith('/api/regles') && method !== 'GET') return true;
  if (pathname.startsWith('/api/tarifs') && method !== 'GET') return true;
  if (pathname.startsWith('/api/admin-config') && method !== 'GET') return true;
  if (pathname.startsWith('/api/admin-backoffice') && method !== 'GET') return true;
  if (pathname.startsWith('/api/paiements') && method !== 'GET' && method !== 'HEAD') return true;
  if (pathname.startsWith('/api/stock') && method !== 'GET' && method !== 'HEAD') return true;
  if (pathname.startsWith('/api/factures') && method !== 'GET' && method !== 'HEAD') return true;
  if (pathname.startsWith('/api/clients') && method === 'DELETE') return true;
  if (pathname.match(/\/api\/clients\/[^/]+$/) && method === 'PATCH') return true;
  if (pathname.startsWith('/api/commandes') && method !== 'GET' && method !== 'HEAD') return true;
  // Mutations RH bloquées en démo (Lot A6) — lecture GET autorisée si session
  if (pathname.startsWith('/api/rh') && method !== 'GET' && method !== 'HEAD') return true;
  if (pathname.startsWith('/api/cart/checkout') && method === 'POST') {
    return true;
  }
  if (method === 'DELETE') return true;
  return false;
}

export function canManageUsers(role: string): boolean {
  return role === 'admin' || role === 'manager';
}

/** Override workflow (acompte, BAT, qualité) — direction uniquement. */
export function canWorkflowForce(role: string): boolean {
  return role === 'admin' || role === 'manager';
}

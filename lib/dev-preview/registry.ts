import type { TaskStatus } from '@/src/mock/tasks';

export type DevPreviewModule = {
  slug: string;
  title: string;
  description: string;
  route: string;
  mockKey: string;
  status: 'stable' | 'beta' | 'wip';
  taskStatus?: TaskStatus;
};

export const DEV_PREVIEW_MODULES: DevPreviewModule[] = [
  { slug: 'pos', title: 'POS', description: 'Point de vente configurateur 95 articles', route: '/pos', mockKey: 'products', status: 'stable', taskStatus: 'done' },
  { slug: 'admin-prix', title: 'Admin prix', description: 'Backoffice catalogue, règles et templates', route: '/administration/vue-ensemble', mockKey: 'pricing', status: 'stable', taskStatus: 'done' },
  { slug: 'apercus-pos', title: 'Aperçus POS', description: 'Assets preview articles (admin local)', route: '/administration/apercus', mockKey: 'pricing', status: 'stable', taskStatus: 'done' },
  { slug: 'crm', title: 'CRM', description: 'Clients, devis, commandes', route: '/clients', mockKey: 'orders', status: 'stable', taskStatus: 'done' },
  { slug: 'dashboard', title: 'Dashboard', description: 'Cockpit KPI et alertes', route: '/dashboard', mockKey: 'dashboard', status: 'stable', taskStatus: 'done' },
  { slug: 'stock', title: 'Stock', description: 'Matières, seuils et magasins', route: '/stock', mockKey: 'stock', status: 'beta', taskStatus: 'todo' },
  { slug: 'production', title: 'Production', description: 'GPAO dossiers et kanban', route: '/production/dossiers', mockKey: 'production', status: 'beta', taskStatus: 'fix' },
  { slug: 'finance', title: 'Finance', description: 'Charges, marges et fiscalité', route: '/finance/charges', mockKey: 'finance', status: 'stable', taskStatus: 'done' },
  { slug: 'users', title: 'Utilisateurs', description: 'Employés et comptes', route: '/rh/employes', mockKey: 'users', status: 'stable' },
  { slug: 'roles', title: 'Rôles', description: 'Profils et accès modules', route: '/administration/roles-permissions', mockKey: 'roles', status: 'stable' },
  { slug: 'settings', title: 'Paramètres', description: 'Configuration application', route: '/parametres', mockKey: 'settings', status: 'stable', taskStatus: 'done' },
  { slug: 'tasks', title: 'Tâches', description: 'Suivi développement local', route: '/equipe/taches', mockKey: 'tasks', status: 'wip', taskStatus: 'in_progress' },
  { slug: 'auth-ui', title: 'Login & RH', description: 'Aperçu login + déclaration de retard', route: '/dev-preview/auth-ui', mockKey: 'settings', status: 'stable', taskStatus: 'done' },
];

export function getDevPreviewModule(slug: string): DevPreviewModule | undefined {
  return DEV_PREVIEW_MODULES.find((m) => m.slug === slug);
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  done: 'Terminé',
  in_progress: 'En cours',
  todo: 'À faire',
  fix: 'À corriger',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  in_progress: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30',
  todo: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  fix: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
};

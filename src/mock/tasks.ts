export type TaskStatus = 'done' | 'in_progress' | 'todo' | 'fix';

export type DevTask = {
  id: string;
  title: string;
  module: string;
  status: TaskStatus;
  priority: 'haute' | 'moyenne' | 'basse';
  assignee?: string;
  updatedAt: string;
};

export const mockTasks: DevTask[] = [
  { id: 't-001', title: 'Virtualisation liste catalogue (≥60 lignes)', module: 'admin-prix', status: 'done', priority: 'moyenne', assignee: 'Dev', updatedAt: '2026-06-24' },
  { id: 't-002', title: 'Fix E2E login #login-id + hydratation', module: 'settings', status: 'done', priority: 'haute', assignee: 'QA', updatedAt: '2026-06-24' },
  { id: 't-003', title: 'Mode database-full catalogue POS', module: 'pos', status: 'done', priority: 'haute', updatedAt: '2026-06-20' },
  { id: 't-004', title: 'Alertes drift synchronisation', module: 'settings', status: 'done', priority: 'moyenne', updatedAt: '2026-06-18' },
  { id: 't-005', title: 'E2E RH / Finance / GPAO', module: 'production', status: 'in_progress', priority: 'haute', assignee: 'QA', updatedAt: '2026-06-24' },
  { id: 't-006', title: 'API stats GPAO — erreur 500 prod', module: 'production', status: 'fix', priority: 'haute', updatedAt: '2026-06-24' },
  { id: 't-007', title: 'Virtualisation commandes & stock', module: 'stock', status: 'todo', priority: 'moyenne', updatedAt: '2026-06-24' },
  { id: 't-008', title: '2FA admin + CSP headers', module: 'settings', status: 'todo', priority: 'haute', updatedAt: '2026-06-24' },
  { id: 't-009', title: 'Variables catalogue 100 % DB (Lot 3)', module: 'admin-prix', status: 'in_progress', priority: 'haute', updatedAt: '2026-06-22' },
  { id: 't-010', title: 'Polish messagerie ANS Talk plein écran', module: 'crm', status: 'done', priority: 'basse', updatedAt: '2026-06-15' },
];

export function tasksByModule(slug: string) {
  return mockTasks.filter((t) => t.module === slug);
}

export function tasksByStatus(status: TaskStatus) {
  return mockTasks.filter((t) => t.status === status);
}

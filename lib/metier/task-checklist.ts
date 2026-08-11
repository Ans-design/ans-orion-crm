/** Checklist tâche métier — GPAO / équipe */
export type MetierTaskCheckItem = {
  id: string;
  label: string;
  done: boolean;
};

export type MetierTaskComment = {
  id: string;
  author: string;
  body: string;
  at: string;
};

export const DEFAULT_PRODUCTION_CHECKLIST: MetierTaskCheckItem[] = [
  { id: 'prep', label: 'Préparation fichiers / matière', done: false },
  { id: 'machine', label: 'Réglage machine validé', done: false },
  { id: 'epreuve', label: 'Épreuve / BAT interne OK', done: false },
  { id: 'qc', label: 'Contrôle qualité effectué', done: false },
];

export function parseTaskChecklist(raw: unknown): MetierTaskCheckItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is MetierTaskCheckItem =>
      x && typeof x === 'object' && typeof (x as MetierTaskCheckItem).id === 'string'
      && typeof (x as MetierTaskCheckItem).label === 'string'
      && typeof (x as MetierTaskCheckItem).done === 'boolean',
  );
}

export function parseTaskComments(raw: unknown): MetierTaskComment[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is MetierTaskComment =>
      x && typeof x === 'object' && typeof (x as MetierTaskComment).body === 'string',
  );
}

export function checklistProgress(items: MetierTaskCheckItem[]): { done: number; total: number; pct: number } {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

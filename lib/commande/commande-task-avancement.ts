/**
 * Avancement commande / jalons atelier dérivés des tâches personnel (MetierTask).
 * Source de vérité = statut des tâches assignées (À faire → En cours → Terminée).
 */

export type PersonnelTaskLite = {
  id?: string;
  title: string;
  status: string;
  assigneeName?: string | null;
  type?: string | null;
};

export type JalonTaskBinding = {
  jalon: string;
  /** Statut commande suggéré quand ce jalon est atteint (tâche terminée). */
  statut: string;
  donePct: number;
  /** % si la tâche est seulement en cours (optionnel). */
  enCoursPct?: number;
  /** Libellé jalon alternatif pendant « En cours ». */
  jalonEnCours?: string;
  match: RegExp;
};

/** Ordre pipeline — aligné COMMANDE_PRODUCTION_STEPS + GPAO_COMMANDE_STEPS. */
export const COMMANDE_JALON_TASK_BINDINGS: JalonTaskBinding[] = [
  {
    jalon: 'Validation client',
    statut: 'À planifier',
    donePct: 10,
    enCoursPct: 5,
    match: /graphisme/i,
  },
  {
    jalon: 'BAT approuvé',
    jalonEnCours: 'BAT envoyé',
    statut: 'En production',
    donePct: 30,
    enCoursPct: 20,
    match: /\bbat\b/i,
  },
  {
    jalon: 'En impression',
    statut: 'En production',
    donePct: 50,
    enCoursPct: 40,
    match: /impression/i,
  },
  {
    jalon: 'Façonnage',
    statut: 'En finition',
    donePct: 75,
    enCoursPct: 60,
    match: /fa[cç]onnage/i,
  },
  {
    jalon: 'Prêt à livrer',
    statut: 'Prête',
    donePct: 90,
    enCoursPct: 85,
    match: /contr[oô]le|qualit/i,
  },
  {
    jalon: 'Livrée',
    statut: 'Livré',
    donePct: 100,
    enCoursPct: 95,
    match: /livraison/i,
  },
];

function taskScore(status: string): number {
  if (status === 'Terminée') return 1;
  if (status === 'En cours' || status === 'En pause') return 0.5;
  if (status === 'Bloquée') return 0.25;
  return 0;
}

function findTaskForBinding(tasks: PersonnelTaskLite[], binding: JalonTaskBinding) {
  return tasks.find((t) => binding.match.test(t.title)) ?? null;
}

export type CommandeTaskAvancementResult = {
  avancement: number;
  /** Jalon atelier courant (libellé UI). */
  activeJalon: string | null;
  /** Statut commande suggéré. */
  suggestedStatut: string | null;
  /** Détail par jalon pour la sidebar / modale. */
  jalons: {
    jalon: string;
    status: 'todo' | 'running' | 'done' | 'blocked' | 'missing';
    assigneeName: string | null;
    taskTitle: string | null;
    pct: number;
  }[];
};

/**
 * Calcule l’avancement + jalon actif selon les tâches des employés sur la commande.
 */
export function computeCommandeAvancementFromTasks(
  tasks: PersonnelTaskLite[],
): CommandeTaskAvancementResult {
  const usable = tasks.filter((t) => t.status !== 'Annulée');
  const jalons = COMMANDE_JALON_TASK_BINDINGS.map((binding) => {
    const task = findTaskForBinding(usable, binding);
    if (!task) {
      return {
        jalon: binding.jalon,
        status: 'missing' as const,
        assigneeName: null,
        taskTitle: null,
        pct: binding.donePct,
      };
    }
    if (task.status === 'Terminée') {
      return {
        jalon: binding.jalon,
        status: 'done' as const,
        assigneeName: task.assigneeName ?? null,
        taskTitle: task.title,
        pct: binding.donePct,
      };
    }
    if (task.status === 'Bloquée') {
      return {
        jalon: binding.jalonEnCours ?? binding.jalon,
        status: 'blocked' as const,
        assigneeName: task.assigneeName ?? null,
        taskTitle: task.title,
        pct: binding.enCoursPct ?? Math.round(binding.donePct * 0.5),
      };
    }
    if (task.status === 'En cours' || task.status === 'En pause') {
      return {
        jalon: binding.jalonEnCours ?? binding.jalon,
        status: 'running' as const,
        assigneeName: task.assigneeName ?? null,
        taskTitle: task.title,
        pct: binding.enCoursPct ?? Math.round(binding.donePct * 0.5),
      };
    }
    return {
      jalon: binding.jalon,
      status: 'todo' as const,
      assigneeName: task.assigneeName ?? null,
      taskTitle: task.title,
      pct: binding.donePct,
    };
  });

  // Pipeline : jalon actif = étape en cours / bloquée, sinon prochaine à faire
  let furthestPct = 0;
  let activeJalon: string | null = null;
  let suggestedStatut: string | null = null;
  let lastDoneJalon: string | null = null;
  let lastDoneStatut: string | null = null;

  for (let i = 0; i < COMMANDE_JALON_TASK_BINDINGS.length; i++) {
    const binding = COMMANDE_JALON_TASK_BINDINGS[i]!;
    const row = jalons[i]!;
    if (row.status === 'done') {
      furthestPct = Math.max(furthestPct, binding.donePct);
      lastDoneJalon = binding.jalon;
      lastDoneStatut = binding.statut;
      continue;
    }
    if (row.status === 'running' || row.status === 'blocked') {
      furthestPct = Math.max(furthestPct, row.pct);
      activeJalon = row.jalon;
      suggestedStatut = binding.statut;
      break;
    }
    // première étape encore à faire = jalon courant
    if (row.status === 'todo' || row.status === 'missing') {
      activeJalon = binding.jalonEnCours ?? binding.jalon;
      suggestedStatut = binding.statut;
      break;
    }
  }

  if (activeJalon == null) {
    activeJalon = lastDoneJalon;
    suggestedStatut = lastDoneStatut;
  }

  // Si aucune tâche ne matche le pipeline GPAO, moyenne simple des tâches présentes
  const anyBindingMatch = COMMANDE_JALON_TASK_BINDINGS.some((b) => findTaskForBinding(usable, b));
  if (!anyBindingMatch && usable.length > 0) {
    const avg =
      usable.reduce((sum, t) => sum + taskScore(t.status), 0) / usable.length;
    furthestPct = Math.round(avg * 100);
  }

  return {
    avancement: Math.max(0, Math.min(100, furthestPct)),
    activeJalon,
    suggestedStatut,
    jalons,
  };
}

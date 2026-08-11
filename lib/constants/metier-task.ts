export const TASK_TYPES = ['production', 'graphisme', 'finition', 'logistique', 'commercial'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = ['À faire', 'En cours', 'En pause', 'Terminée', 'Bloquée', 'Annulée'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['Urgent', 'Haute', 'Normal', 'Basse'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TIMER_ACTIONS = ['start', 'pause', 'resume', 'finish', 'problem'] as const;
export type TimerAction = (typeof TIMER_ACTIONS)[number];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  production: 'Production',
  graphisme: 'Graphisme',
  finition: 'Finition',
  logistique: 'Logistique',
  commercial: 'Commercial',
};

export const TASK_TYPE_ROLES: Record<TaskType, string> = {
  production: 'production',
  graphisme: 'designer',
  finition: 'production',
  logistique: 'livraison',
  commercial: 'commercial',
};

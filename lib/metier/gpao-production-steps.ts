import type { TaskType } from '@/lib/constants/metier-task';
import { TASK_TYPE_ROLES } from '@/lib/constants/metier-task';

/** Étapes GPAO standard à la validation commande (plan §2.1). */
export type GpaoProductionStep = {
  title: string;
  type: TaskType;
  assigneeRole: string;
  estimatedMin: number;
};

export const GPAO_COMMANDE_STEPS: GpaoProductionStep[] = [
  { title: 'Graphisme', type: 'graphisme', assigneeRole: TASK_TYPE_ROLES.graphisme, estimatedMin: 90 },
  { title: 'BAT', type: 'graphisme', assigneeRole: TASK_TYPE_ROLES.graphisme, estimatedMin: 60 },
  { title: 'Impression', type: 'production', assigneeRole: TASK_TYPE_ROLES.production, estimatedMin: 120 },
  { title: 'Façonnage', type: 'finition', assigneeRole: 'faconnage', estimatedMin: 75 },
  { title: 'Contrôle qualité', type: 'finition', assigneeRole: TASK_TYPE_ROLES.production, estimatedMin: 30 },
  { title: 'Livraison', type: 'logistique', assigneeRole: TASK_TYPE_ROLES.logistique, estimatedMin: 45 },
];

export const GPAO_PRODUCTION_STATUTS = [
  'À planifier',
  'En production',
  'En finition',
  'Contrôle',
  'Livraison',
  'Terminé',
] as const;

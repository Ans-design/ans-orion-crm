import { z } from 'zod';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
} from '@/lib/constants/metier-task';

export const createMetierTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(TASK_TYPES).optional(),
  priorite: z.enum(TASK_PRIORITIES).optional(),
  commandeId: z.string().optional().nullable(),
  productionId: z.string().optional().nullable(),
  assigneeName: z.string().max(100).optional().nullable(),
  estimatedMin: z.number().int().min(1).max(9999).optional().nullable(),
});

const checklistItemSchema = z.object({
  id: z.string().max(50),
  label: z.string().max(200),
  done: z.boolean(),
});

const commentSchema = z.object({
  id: z.string().max(50),
  author: z.string().max(100),
  body: z.string().max(1000),
  at: z.string(),
});

export const patchMetierTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(TASK_STATUSES).optional(),
  priorite: z.enum(TASK_PRIORITIES).optional(),
  assigneeName: z.string().max(100).optional().nullable(),
  estimatedMin: z.number().int().min(1).max(9999).optional().nullable(),
  problemNote: z.string().max(500).optional().nullable(),
  checklist: z.array(checklistItemSchema).optional().nullable(),
  comments: z.array(commentSchema).optional().nullable(),
  addComment: z.string().max(1000).optional(),
});

export type MetierTaskListQuery = {
  statsOnly?: boolean;
  kpi?: boolean;
  type?: string;
  status?: string;
  commandeId?: string;
  mine?: boolean;
};

export function parseMetierTaskListQuery(params: URLSearchParams): MetierTaskListQuery {
  return {
    statsOnly: params.get('stats') === '1',
    kpi: params.get('kpi') === '1',
    type: params.get('type') || undefined,
    status: params.get('status') || undefined,
    commandeId: params.get('commandeId') || params.get('commande') || undefined,
    mine: params.get('mine') === '1',
  };
}

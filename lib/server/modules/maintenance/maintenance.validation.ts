import { z } from 'zod';

export const createMaintenanceTicketSchema = z.object({
  titre: z.string().min(3).max(200),
  type: z.string().optional(),
  priorite: z.string().optional(),
  description: z.string().optional().nullable(),
  machineId: z.string().optional().nullable(),
  equipmentId: z.string().optional().nullable(),
  impactPlanning: z.boolean().optional(),
});

export const updateMaintenanceTicketSchema = z.object({
  statut: z.string().optional(),
  priorite: z.string().optional(),
  diagnostic: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  costMGA: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  resolution: z.string().optional().nullable(),
  impactPlanning: z.boolean().optional(),
});

export type CreateMaintenanceTicketInput = z.infer<typeof createMaintenanceTicketSchema>;
export type UpdateMaintenanceTicketInput = z.infer<typeof updateMaintenanceTicketSchema>;

import { z } from 'zod';
import { createClientSchema, quickCreateClientSchema, updateClientSchema } from '@/lib/validators/crm';

export const createClientInputSchema = createClientSchema;
export const updateClientInputSchema = updateClientSchema;
export const quickCreateClientInputSchema = quickCreateClientSchema;

export const mergeClientsInputSchema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
});

export const clientListQuerySchema = z.object({
  search: z.string().optional(),
  statut: z.string().optional(),
  archived: z.enum(['true', 'false']).optional(),
  summary: z.enum(['1']).optional(),
});

export type CreateClientInput = z.infer<typeof createClientInputSchema>;
export type UpdateClientInput = z.infer<typeof updateClientInputSchema>;
export type QuickCreateClientInput = z.infer<typeof quickCreateClientInputSchema>;
export type MergeClientsInput = z.infer<typeof mergeClientsInputSchema>;

import { z } from 'zod';
import { createDevisSchema } from '@/lib/validators/crm';

export const createDevisInputSchema = createDevisSchema;

export const updateDevisInputSchema = z.object({
  statut: z.string().optional(),
  notes: z.string().max(2000).nullable().optional(),
  clientId: z.string().nullable().optional(),
  remise: z.number().min(0).max(100).optional(),
});

export type CreateDevisInput = z.infer<typeof createDevisInputSchema>;
export type UpdateDevisInput = z.infer<typeof updateDevisInputSchema>;

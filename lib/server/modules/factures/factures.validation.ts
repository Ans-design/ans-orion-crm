import { z } from 'zod';
import { createFactureSchema, updateFactureSchema } from '@/lib/validators/crm';

export const createFactureInputSchema = createFactureSchema;
export const updateFactureInputSchema = updateFactureSchema;

export type CreateFactureInput = z.infer<typeof createFactureInputSchema>;
export type UpdateFactureInput = z.infer<typeof updateFactureInputSchema>;

export type FactureListQuery = {
  search: string;
  statut: string;
  impayes: boolean;
  overdue: boolean;
  commandeId: string;
  stats: boolean;
  trash?: boolean;
};

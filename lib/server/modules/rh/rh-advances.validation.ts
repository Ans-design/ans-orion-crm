import { z } from 'zod';

export const createAdvanceInputSchema = z.object({
  employeeId: z.string().min(1),
  montant: z.number().positive(),
  motif: z.string().optional(),
});

export const updateAdvanceInputSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['rembourser', 'annuler']),
});

export type CreateAdvanceInput = z.infer<typeof createAdvanceInputSchema>;
export type UpdateAdvanceInput = z.infer<typeof updateAdvanceInputSchema>;

export type AdvanceListQuery = {
  employeeId?: string;
  statut?: string;
};

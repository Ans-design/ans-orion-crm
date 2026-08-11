import { z } from 'zod';
import { batchPaiementSchema, createPaiementSchema } from '@/lib/validators/crm';

export const createPaiementInputSchema = createPaiementSchema;
export const batchPaiementInputSchema = batchPaiementSchema;

export const updatePaiementInputSchema = z.object({
  montant: z.number().positive().optional(),
  mode: z.string().max(50).optional(),
  reference: z.string().max(100).nullable().optional(),
  type: z.enum(['Acompte', 'Solde', 'Remboursement']).optional(),
  notes: z.string().max(500).nullable().optional(),
  datePaiement: z.union([z.string(), z.date()]).optional(),
});

export type CreatePaiementInput = z.infer<typeof createPaiementInputSchema>;
export type BatchPaiementInput = z.infer<typeof batchPaiementInputSchema>;
export type UpdatePaiementInput = z.infer<typeof updatePaiementInputSchema>;

export type PaiementListQuery = {
  search: string;
  mode: string;
  commandeId: string;
  trash?: boolean;
};

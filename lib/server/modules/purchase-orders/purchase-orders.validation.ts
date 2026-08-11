import { z } from 'zod';

export const PURCHASE_ORDER_STATUTS = [
  'Brouillon',
  'Commandé',
  'Reçu partiel',
  'Reçu',
  'Annulé',
] as const;

export const patchPurchaseOrderSchema = z.object({
  action: z.literal('receive').optional(),
  statut: z.enum(PURCHASE_ORDER_STATUTS).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export type PatchPurchaseOrderInput = z.infer<typeof patchPurchaseOrderSchema>;

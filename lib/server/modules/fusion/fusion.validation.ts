import { z } from 'zod';

export const fusionMaterialPatchSchema = z.object({
  type: z.enum(['grammage', 'material']).optional(),
  id: z.string().min(1).max(64),
  actif: z.boolean(),
});

export const fusionSalePricePatchSchema = z.object({
  id: z.string().min(1).max(64),
  actif: z.boolean(),
});

export const fusionSalePricePutSchema = z.object({
  id: z.string().min(1).max(64),
  salePriceAr: z.coerce.number().min(0),
  comment: z.string().max(500).optional(),
});

export const fusionSalePricePostSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('reset_row'), id: z.string().min(1).max(64) }),
  z.object({ action: z.literal('reset_modified') }),
]);

export const fusionAnomalyPatchSchema = z.object({
  id: z.string().min(1).max(64),
  resolved: z.boolean(),
  decision: z.string().max(500).optional(),
});

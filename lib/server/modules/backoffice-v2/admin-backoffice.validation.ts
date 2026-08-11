import { z } from 'zod';

export const patchArticlePriceRowSchema = z.object({
  prixBase: z.number().nullable().optional(),
  prixM2: z.number().nullable().optional(),
  qtyMin: z.number().int().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  active: z.boolean().optional(),
  calculationType: z.string().optional(),
  saleUnit: z.string().optional(),
});

export const bulkPatchArticlePriceSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  patch: patchArticlePriceRowSchema,
});

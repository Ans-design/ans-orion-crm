import { z } from 'zod';

const articlePricingFields = {
  articleLabel: z.string().trim().max(200).optional(),
  family: z.string().trim().max(80).optional(),
  calculationType: z.string().trim().max(40).optional(),
  saleUnit: z.string().trim().max(40).optional(),
  prixBase: z.coerce.number().min(0).nullable().optional(),
  prixM2: z.coerce.number().min(0).nullable().optional(),
  prixCm2: z.coerce.number().min(0).nullable().optional(),
  qtyMin: z.coerce.number().int().min(1).nullable().optional(),
  status: z.string().trim().max(20).optional(),
};

export const createBackofficeArticleSchema = z.object({
  articleId: z.string().trim().min(1).max(80),
  ...articlePricingFields,
});

export const updateBackofficeArticleSchema = z.object({
  ...articlePricingFields,
  active: z.boolean().optional(),
});

export type CreateBackofficeArticleBody = z.infer<typeof createBackofficeArticleSchema>;
export type UpdateBackofficeArticleBody = z.infer<typeof updateBackofficeArticleSchema>;

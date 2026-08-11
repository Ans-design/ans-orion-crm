import { z } from 'zod';

export const tarifListQuerySchema = z.object({
  articleId: z.string().max(80).optional(),
  search: z.string().max(120).optional(),
});

export const upsertTarifSchema = z.object({
  articleId: z.string().min(1).max(80),
  articleLabel: z.string().min(1).max(200),
  palier: z.number().int().min(1).max(999).optional().default(1),
  prixUnitaire: z.number().min(0).max(999_999_999).optional().default(0),
  prixBase: z.number().min(0).max(999_999_999).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type TarifListQuery = z.infer<typeof tarifListQuerySchema>;
export type UpsertTarifInput = z.infer<typeof upsertTarifSchema>;

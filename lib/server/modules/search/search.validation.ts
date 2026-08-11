import { z } from 'zod';

export const globalSearchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Minimum 2 caractères').max(120),
});

export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;

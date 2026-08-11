import { z } from 'zod';

export const createProofVersionSchema = z.object({
  versionLabel: z.string().min(1).max(20),
  statut: z.string().optional(),
  notes: z.string().optional().nullable(),
  fileAssetId: z.string().optional().nullable(),
});

export type CreateProofVersionInput = z.infer<typeof createProofVersionSchema>;

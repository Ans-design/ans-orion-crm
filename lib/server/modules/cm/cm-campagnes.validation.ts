import { z } from 'zod';

export const cmCampaignPostSchema = z.object({
  titre: z.string().min(1).max(200),
  contenu: z.string().max(5000).optional().nullable(),
  platform: z.string().max(80).optional(),
  statut: z.string().max(40).optional(),
  scheduledAt: z.string().optional().nullable(),
});

export const cmCampaignPatchStatutSchema = z
  .object({ statut: z.string().min(1).max(40) })
  .strict();

export const cmCampaignPatchPostSchema = z.object({
  postId: z.string().min(1),
  statut: z.string().max(40).optional(),
  titre: z.string().max(200).optional(),
  contenu: z.string().max(5000).optional(),
});

export const cmCampaignPatchSchema = cmCampaignPatchPostSchema;

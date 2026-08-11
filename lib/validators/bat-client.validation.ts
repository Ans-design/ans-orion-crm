import { z } from 'zod';

export const batClientActionSchema = z.object({
  action: z.enum(['accept', 'refuse']).optional().default('accept'),
  commentaire: z.string().trim().max(2000).optional().default(''),
});

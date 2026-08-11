import { z } from 'zod';

export const createConversationInputSchema = z.object({
  type: z.enum(['private', 'group']),
  targetUserId: z.string().optional(),
  name: z.string().min(1).max(128).optional(),
  memberIds: z.array(z.string()).optional(),
});

export const createOrderConversationInputSchema = z.object({
  commandeId: z.string().min(1),
});

export const createDossierConversationInputSchema = z.object({
  dossierId: z.string().min(1),
});

export type CreateConversationInput = z.infer<typeof createConversationInputSchema>;
export type CreateOrderConversationInput = z.infer<typeof createOrderConversationInputSchema>;
export type CreateDossierConversationInput = z.infer<typeof createDossierConversationInputSchema>;

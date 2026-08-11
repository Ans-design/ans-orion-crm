import { z } from 'zod';

export const sendMessageInputSchema = z.object({
  body: z.string().max(8000).optional(),
  replyToId: z.string().optional(),
  attachmentIds: z.array(z.string()).optional(),
  commandeId: z.string().optional(),
  clientMessageId: z.string().min(1).max(128).optional(),
});

export const editMessageInputSchema = z.object({
  body: z.string().min(1).max(8000),
});

export const messageReactionInputSchema = z.object({
  emoji: z.string().min(1).max(8),
});

export const messagePinInputSchema = z.object({
  pinned: z.boolean(),
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;
export type EditMessageInput = z.infer<typeof editMessageInputSchema>;
export type MessageReactionInput = z.infer<typeof messageReactionInputSchema>;
export type MessagePinInput = z.infer<typeof messagePinInputSchema>;

export const createTaskFromMessageInputSchema = z.object({
  title: z.string().min(1).max(200),
  assigneeName: z.string().optional(),
  commandeId: z.string().optional(),
});

export type CreateTaskFromMessageInput = z.infer<typeof createTaskFromMessageInputSchema>;

export type MessageListQuery = {
  search?: string;
  before?: string;
  limit?: number;
};

import { z } from 'zod';
import { TALK_ATTACHMENT_STATUSES } from '@/lib/messaging/constants';

export const attachmentStatusInputSchema = z.object({
  status: z.enum(TALK_ATTACHMENT_STATUSES as unknown as [string, ...string[]]),
});

export type AttachmentStatusInput = z.infer<typeof attachmentStatusInputSchema>;

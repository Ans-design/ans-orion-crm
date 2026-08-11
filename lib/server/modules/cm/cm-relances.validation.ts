import { z } from 'zod';

export const markRelanceSentSchema = z.object({
  action: z.literal('sent'),
});

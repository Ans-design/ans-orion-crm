import { z } from 'zod';

export const updateUserSettingsSchema = z.object({
  category: z.enum(['appearance', 'notifications']),
  data: z.record(z.unknown()).optional().default({}),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;

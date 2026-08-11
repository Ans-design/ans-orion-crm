import { z } from 'zod';

export const markNotificationsSchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  markAllRead: z.boolean().optional(),
}).refine((d) => d.markAllRead || (d.ids?.length ?? 0) > 0, {
  message: 'ids ou markAllRead requis',
});

export type MarkNotificationsInput = z.infer<typeof markNotificationsSchema>;

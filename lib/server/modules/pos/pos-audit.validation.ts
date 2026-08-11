import { z } from 'zod';

export const posAuditSchema = z.object({
  action: z.string().trim().min(1).max(120),
  entity: z.string().trim().max(120).optional(),
  entityLabel: z.string().trim().max(200).optional(),
  details: z.record(z.unknown()).optional(),
});

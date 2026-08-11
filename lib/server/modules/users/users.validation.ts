import { z } from 'zod';
import { ROLES } from '@/lib/auth/permissions';

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1).max(64),
  role: z.enum(ROLES),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

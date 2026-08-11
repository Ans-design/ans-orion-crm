import { z } from 'zod';
import { ROLES } from '@/lib/auth/permissions';

export const permissionUpdateSchema = z.object({
  action: z.enum(['update_role', 'update_user', 'reset_role', 'reset_user']),
  role: z.enum(ROLES).optional(),
  userId: z.string().min(1).max(64).optional(),
  moduleId: z.string().min(1).max(80),
  flags: z.record(z.boolean()).optional(),
});

export const patchPermissionSchema = z.object({
  role: z.enum(ROLES),
  moduleId: z.string().min(1).max(80),
  flags: z.record(z.boolean()),
});

export type PermissionUpdateInput = z.infer<typeof permissionUpdateSchema>;

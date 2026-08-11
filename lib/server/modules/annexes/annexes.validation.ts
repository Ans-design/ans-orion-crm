import { z } from 'zod';

export const annexCreateSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(1).max(200),
  adresse: z.string().max(300).optional().nullable(),
  ville: z.string().max(100).optional().nullable(),
  tel: z.string().max(30).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const annexPostSchema = z.union([
  z.object({
    action: z.literal('set_filter'),
    activeSite: z.string().max(20).optional().default('ALL'),
  }),
  z.object({
    action: z.literal('assign_employee'),
    employeeId: z.string().min(1),
    site: z.string().min(1).max(20),
  }),
  z.object({
    action: z.literal('transfer_stock'),
    stockItemId: z.string().min(1),
    targetSite: z.string().min(1).max(20),
    quantity: z.coerce.number().positive(),
  }),
  annexCreateSchema,
]);

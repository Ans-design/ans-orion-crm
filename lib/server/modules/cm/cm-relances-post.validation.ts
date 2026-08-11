import { z } from 'zod';

export const cmRelanceCreateSchema = z.object({
  clientId: z.string().optional().nullable(),
  type: z.string().max(80).optional(),
  canal: z.string().max(40).optional(),
  objet: z.string().min(1).max(200),
  message: z.string().max(5000).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  templateId: z.string().optional().nullable(),
});

export const cmMessageTemplateSchema = z.object({
  action: z.literal('template'),
  name: z.string().min(1).max(120),
  canal: z.string().max(40).optional(),
  category: z.string().max(80).optional(),
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1).max(10000),
});

export const cmRelancePostSchema = z.union([
  cmMessageTemplateSchema,
  cmRelanceCreateSchema,
]);

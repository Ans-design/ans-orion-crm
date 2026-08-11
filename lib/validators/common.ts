import { z } from 'zod';

export const emailSchema = z.string().trim().email('Email invalide').max(255);
export const passwordSchema = z.string().min(8, 'Mot de passe : 8 caractères minimum').max(128);
export const cuidSchema = z.string().min(1).max(64);
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export function parseBody<T extends z.ZodTypeAny>(schema: T, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.errors.map((e) => e.message).join(', ');
    return { ok: false as const, error: msg };
  }
  return { ok: true as const, data: result.data as z.infer<T> };
}

import { z } from 'zod';

export const cuidSchema = z.string().trim().min(1).max(64);
export const emailSchema = z.string().trim().email('Email invalide').max(255);
export const passwordSchema = z.string().min(8, 'Mot de passe : 8 caractères minimum').max(128);

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const positiveAmountSchema = z.coerce
  .number()
  .positive('Le montant doit être supérieur à 0');

export const qtySchema = z.coerce.number().int().min(1, 'Quantité minimale : 1');

export const isoDateSchema = z.string().datetime({ offset: true }).or(z.coerce.date());

export function parseZod<T extends z.ZodTypeAny>(schema: T, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.flatten();
    return { ok: false as const, error: details };
  }
  return { ok: true as const, data: result.data as z.infer<T> };
}

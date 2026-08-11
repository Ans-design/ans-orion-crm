import { z } from 'zod';
import { badRequest } from '@/lib/server/http/api-response';
import { logger } from '@/lib/server/logger/logger';

export {
  cuidSchema,
  emailSchema,
  passwordSchema,
  paginationSchema,
  positiveAmountSchema,
  qtySchema,
  isoDateSchema,
  parseZod,
} from '@/lib/server/validation/common-schemas';

export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  label = 'validation',
) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.flatten();
    logger.validationError(label, details);
    return { ok: false as const, error: details, response: badRequest('Données invalides', details) };
  }
  return { ok: true as const, data: result.data as z.infer<T> };
}

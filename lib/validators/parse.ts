import { parseBody } from '@/lib/validators/common';
import { apiError } from '@/lib/api-response';

export function parseOr400<T extends import('zod').ZodTypeAny>(schema: T, data: unknown) {
  const result = parseBody(schema, data);
  if (!result.ok) return { error: apiError(result.error, 400) as ReturnType<typeof apiError> };
  return { data: result.data };
}

import { paginationSchema } from '@/lib/server/validation/common-schemas';

export type PaginationInput = {
  limit: number;
  offset: number;
};

export function parsePaginationParams(searchParams: URLSearchParams): PaginationInput {
  const parsed = paginationSchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  });
  if (parsed.success) return parsed.data;
  return { limit: 50, offset: 0 };
}

export function paginationMeta(total: number, input: PaginationInput) {
  return {
    total,
    limit: input.limit,
    offset: input.offset,
    hasMore: input.offset + input.limit < total,
  };
}

export type PaginationParams = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Parse ?page=1&pageSize=25 (ou limit/offset legacy) */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get('pageSize') || searchParams.get('limit') || 25)),
  );
  const offsetParam = searchParams.get('offset');
  const skip = offsetParam != null ? Math.max(0, Number(offsetParam)) : (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  { page, pageSize }: PaginationParams,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Pagination ON par défaut.
 * Opt-out explicite : `?all=1` (admin / exports contrôlés).
 */
export function wantsPagination(searchParams: URLSearchParams): boolean {
  if (searchParams.get('all') === '1') return false;
  return true;
}

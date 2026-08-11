/** Pagination API — plafond Hostinger (voir docs/PERFORMANCE.md). */
export const API_LIST_MAX_LIMIT = 100;

export type ParsedListParams = {
  page: number;
  limit: number;
  offset: number;
};

export function parseListParams(
  searchParams: URLSearchParams,
  options?: { defaultLimit?: number; maxLimit?: number; defaultPage?: number },
): ParsedListParams {
  const defaultLimit = options?.defaultLimit ?? 40;
  const maxLimit = options?.maxLimit ?? API_LIST_MAX_LIMIT;
  const defaultPage = options?.defaultPage ?? 1;

  const page = Math.max(1, parseInt(searchParams.get('page') ?? String(defaultPage), 10) || defaultPage);
  let rawLimit = parseInt(searchParams.get('limit') ?? '', 10);
  if (!Number.isFinite(rawLimit)) {
    rawLimit = defaultLimit;
  } else if (rawLimit < 1) {
    rawLimit = 1;
  }
  const limit = Math.min(maxLimit, rawLimit);

  return { page, limit, offset: (page - 1) * limit };
}

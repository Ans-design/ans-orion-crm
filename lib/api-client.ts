/**
 * Helpers client pour lire les réponses API standardisées { ok, data, error }.
 * Compatible avec les réponses legacy (corps plat).
 */

export type ApiErrorShape = {
  message: string;
  code?: string;
  details?: unknown;
};

export function unwrapApiData<T>(body: unknown): T {
  if (body && typeof body === 'object' && (body as { ok?: boolean }).ok === true && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/**
 * Normalise listes API : tableau brut, `{ items }`, `{ commandes }`, ou enveloppe `{ ok, data }`.
 * Évite les crashes `.map is not a function` (B-06).
 */
export function unwrapListItems<T = unknown>(body: unknown): T[] {
  const data = unwrapApiData<unknown>(body);
  if (Array.isArray(data)) return data as T[];
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  if (Array.isArray(record.items)) return record.items as T[];
  if (Array.isArray(record.commandes)) return record.commandes as T[];
  if (Array.isArray(record.clients)) return record.clients as T[];
  if (Array.isArray(record.devis)) return record.devis as T[];
  if (Array.isArray(record.factures)) return record.factures as T[];
  if (Array.isArray(record.paiements)) return record.paiements as T[];
  if (Array.isArray(record.productions)) return record.productions as T[];
  if (Array.isArray(record.livraisons)) return record.livraisons as T[];
  if (Array.isArray(record.messages)) return record.messages as T[];
  if (Array.isArray(record.rows)) return record.rows as T[];
  return [];
}

export type UnwrappedPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Liste paginée ou tableau plat → page homogène. */
export function unwrapPaginated<T = unknown>(body: unknown, fallbackPageSize = 25): UnwrappedPage<T> {
  const data = unwrapApiData<unknown>(body);
  if (Array.isArray(data)) {
    return {
      items: data as T[],
      total: data.length,
      page: 1,
      pageSize: data.length || fallbackPageSize,
      totalPages: 1,
    };
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const items = unwrapListItems<T>(record);
    const total = typeof record.total === 'number' ? record.total : items.length;
    const page = typeof record.page === 'number' ? record.page : 1;
    const pageSize = typeof record.pageSize === 'number' ? record.pageSize : fallbackPageSize;
    const totalPages =
      typeof record.totalPages === 'number'
        ? record.totalPages
        : Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
    return { items, total, page, pageSize, totalPages };
  }
  return { items: [], total: 0, page: 1, pageSize: fallbackPageSize, totalPages: 1 };
}

export function getApiErrorMessage(body: unknown, fallback = 'Erreur'): string {
  if (typeof body === 'string' && body.trim()) return body;
  if (!body || typeof body !== 'object') return fallback;
  const record = body as Record<string, unknown>;
  if (typeof record.message === 'string' && record.message.trim() && !('ok' in record) && !('data' in record)) {
    return record.message;
  }
  if (record.ok === false && record.error) {
    const err = record.error;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && typeof (err as ApiErrorShape).message === 'string') {
      return (err as ApiErrorShape).message;
    }
  }
  if (typeof record.error === 'string') return record.error;
  if (record.error && typeof record.error === 'object' && typeof (record.error as ApiErrorShape).message === 'string') {
    return (record.error as ApiErrorShape).message;
  }
  return fallback;
}

export async function readApiJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(getApiErrorMessage(body, `Erreur (${res.status})`));
  }
  return unwrapApiData<T>(body);
}

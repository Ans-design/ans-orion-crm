import { paginatedResult } from '@/lib/api-pagination';
import type { CrudListOptions, CrudListResult } from './types';

type PrismaDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  count: (args: { where?: Record<string, unknown> }) => Promise<number>;
  findUnique: (args: { where: Record<string, unknown>; include?: Record<string, unknown> }) => Promise<unknown | null>;
};

/** Liste paginée générique — à utiliser depuis les repositories module. */
export async function listEntities<T>(
  delegate: PrismaDelegate,
  options: CrudListOptions = {},
): Promise<CrudListResult<T> | T[]> {
  const where = options.where ?? {};
  const orderBy = options.orderBy ?? { createdAt: 'desc' };
  const base = { where, orderBy, ...(options.include ? { include: options.include } : {}) };

  if (!options.pagination) {
    return delegate.findMany(base) as Promise<T[]>;
  }

  const { skip, take, page, pageSize } = options.pagination;
  const [items, total] = await Promise.all([
    delegate.findMany({ ...base, skip, take }),
    delegate.count({ where }),
  ]);

  return paginatedResult(items as T[], total, options.pagination);
}

export async function getEntity<T>(
  delegate: PrismaDelegate,
  id: string,
  include?: Record<string, unknown>,
): Promise<T | null> {
  return delegate.findUnique({
    where: { id },
    ...(include ? { include } : {}),
  }) as Promise<T | null>;
}

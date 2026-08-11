import type { PaginationParams } from '@/lib/api-pagination';

export type CrudListOptions = {
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[];
  include?: Record<string, unknown>;
  pagination?: PaginationParams;
};

export type CrudListResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type EntityMapper<TModel, TDto> = (row: TModel) => TDto;

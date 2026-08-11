import {
  cancelAdvance,
  createAdvance,
  getAdvanceStats,
  listAdvances,
  settleAdvance,
} from '@/lib/services/employee-advance-service';
import type {
  AdvanceListQuery,
  CreateAdvanceInput,
  UpdateAdvanceInput,
} from './rh-advances.validation';

export function parseAdvanceListQuery(searchParams: URLSearchParams): AdvanceListQuery {
  return {
    employeeId: searchParams.get('employeeId') || undefined,
    statut: searchParams.get('statut') || undefined,
  };
}

export async function listAdvanceRecords(query: AdvanceListQuery) {
  const [advances, stats] = await Promise.all([
    listAdvances(query),
    getAdvanceStats(),
  ]);
  return { advances, stats };
}

export async function createAdvanceRecord(
  input: CreateAdvanceInput,
  createdBy?: string,
) {
  return createAdvance({ ...input, createdBy });
}

export async function updateAdvanceRecord(input: UpdateAdvanceInput) {
  return input.action === 'rembourser'
    ? settleAdvance(input.id)
    : cancelAdvance(input.id);
}

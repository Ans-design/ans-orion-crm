import {
  checkInEmployee,
  checkOutEmployee,
  getEmployeeByUserId,
  justifyRetard,
  listPresences,
} from '@/lib/services/rh-service';
import type { JustifyRetardInput, PresenceActionInput, PresenceListQuery } from './rh.validation';

export function parsePresenceListQuery(searchParams: URLSearchParams): PresenceListQuery {
  const dateStr = searchParams.get('date');
  return {
    employeeId: searchParams.get('employeeId') || undefined,
    date: dateStr ? new Date(dateStr) : new Date(),
  };
}

export async function listPresenceRecords(query: PresenceListQuery) {
  return listPresences(query);
}

export async function runPresenceAction(
  input: PresenceActionInput,
  auth: { userId: string },
) {
  let employeeId = input.employeeId;
  if (!employeeId && auth.userId) {
    const emp = await getEmployeeByUserId(auth.userId);
    employeeId = emp?.id;
  }
  if (!employeeId) {
    return { ok: false as const, code: 'NO_EMPLOYEE' as const, message: 'Employé non lié au compte' };
  }

  const result =
    input.action === 'checkin'
      ? await checkInEmployee(employeeId)
      : await checkOutEmployee(employeeId);

  return { ok: true as const, result };
}

export async function justifyPresenceRetard(presenceId: string, input: JustifyRetardInput) {
  return justifyRetard(presenceId, input.cause, input.remarque);
}

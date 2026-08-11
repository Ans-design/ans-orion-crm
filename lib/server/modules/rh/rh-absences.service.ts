import {
  createAbsenceRequest,
  getEmployeeByUserId,
  listAbsences,
  reviewAbsence,
} from '@/lib/services/rh-service';
import type { AbsenceListQuery, CreateAbsenceInput, ReviewAbsenceInput } from './rh.validation';

export function parseAbsenceListQuery(searchParams: URLSearchParams): AbsenceListQuery {
  return {
    statut: searchParams.get('statut') || undefined,
    employeeId: searchParams.get('employeeId') || undefined,
  };
}

export async function listAbsenceRecords(query: AbsenceListQuery) {
  return listAbsences(query);
}

export async function createAbsenceRecord(
  input: CreateAbsenceInput,
  auth: { userId: string },
) {
  let employeeId = input.employeeId;
  if (!employeeId && auth.userId) {
    const emp = await getEmployeeByUserId(auth.userId);
    employeeId = emp?.id;
  }
  if (!employeeId) {
    return { ok: false as const, code: 'NO_EMPLOYEE' as const, message: 'Employé non lié — contactez RH' };
  }

  const absence = await createAbsenceRequest({
    employeeId,
    type: input.type,
    dateDebut: new Date(input.dateDebut),
    dateFin: new Date(input.dateFin),
    motif: input.motif,
  });

  return { ok: true as const, absence };
}

export async function reviewAbsenceRecord(
  input: ReviewAbsenceInput,
  reviewerName: string,
) {
  const absence = await reviewAbsence(input.id, input.statut, reviewerName);
  return { ok: true as const, absence };
}

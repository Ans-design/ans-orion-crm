import { prisma } from '@/lib/prisma';
import {
  checkInEmployee,
  computeRetardMin,
  getEmployeeForSession,
  justifyRetard,
  startOfDay,
} from '@/lib/services/rh-service';
import { DEFAULT_HORAIRE, LATE_CAUSES, type LateCause } from '@/lib/constants/rh';
import { clearRhAttendanceCache, isRhAttendanceGuardEnabled } from '@/lib/server/auth/rh-attendance-guard';
import type { LateDeclarationInput } from './rh.validation';

export { LATE_CAUSES };
export type { LateCause };

async function resolveEmployee(userId: string, matricule?: string | null) {
  return getEmployeeForSession(userId, matricule);
}

function isAfterScheduledArrival(now: Date, horaireDebut: string | null): boolean {
  const [h, m] = (horaireDebut ?? DEFAULT_HORAIRE.debut).split(':').map(Number);
  const scheduled = new Date(now);
  scheduled.setHours(h, m ?? 0, 0, 0);
  return now > scheduled;
}

/** Vérifie si l'utilisateur doit remplir une déclaration de retard avant d'accéder à l'app. */
export async function getLateArrivalGate(userId: string, matricule?: string | null) {
  // Aligné sur la garde middleware : E2E / local SKIP_RH_ATTENDANCE_GUARD_IN_DEV
  if (!isRhAttendanceGuardEnabled()) {
    return { blocked: false as const, reason: 'guard_disabled' as const };
  }

  const employee = await resolveEmployee(userId, matricule);
  if (!employee) {
    return { blocked: false as const, reason: 'no_employee' as const };
  }

  const now = new Date();
  if (!isAfterScheduledArrival(now, employee.horaireDebut)) {
    return { blocked: false as const, reason: 'on_time_window' as const };
  }

  const today = startOfDay();
  let presence = await prisma.employeePresence.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (!presence) {
    presence = await checkInEmployee(employee.id);
  }

  const retardMin = presence.retardMin ?? computeRetardMin(now, employee.horaireDebut);
  if (retardMin <= 0 && presence.statut !== 'Retard') {
    return { blocked: false as const, reason: 'not_late' as const };
  }

  if (presence.cause && (presence.statut === 'Justifié' || presence.statut === 'Présent')) {
    return { blocked: false as const, reason: 'already_declared' as const };
  }

  return {
    blocked: true as const,
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    matricule: employee.matricule,
    poste: employee.poste ?? null,
    departement: employee.departement ?? null,
    presenceId: presence.id,
    scheduledTime: employee.horaireDebut ?? DEFAULT_HORAIRE.debut,
    currentTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    retardMin,
    causes: LATE_CAUSES,
  };
}

export async function submitLateDeclaration(
  userId: string,
  data: { cause: string; remarque?: string | null },
  matricule?: string | null,
) {
  const gate = await getLateArrivalGate(userId, matricule);
  if (!gate.blocked) {
    return { ok: true, alreadyClear: true };
  }

  if (!LATE_CAUSES.includes(data.cause as LateCause)) {
    throw new Error('Cause du retard invalide');
  }

  const presence = await justifyRetard(gate.presenceId, data.cause, data.remarque ?? undefined);

  await prisma.employee.update({
    where: { id: gate.employeeId },
    data: { presenceStatut: 'Présent' },
  });

  clearRhAttendanceCache(userId);

  return { ok: true, presence };
}

export async function getLateArrivalStatus(userId: string, matricule?: string | null) {
  return getLateArrivalGate(userId, matricule);
}

export async function declareLateArrival(
  userId: string,
  input: LateDeclarationInput,
  matricule?: string | null,
) {
  return submitLateDeclaration(userId, input, matricule);
}

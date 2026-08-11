import { prisma } from '@/lib/prisma';
import { DEFAULT_HORAIRE } from '@/lib/constants/rh';

export function startOfDay(d: Date = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseHoraireMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function computeRetardMin(checkIn: Date, horaireDebut: string | null): number {
  const expected = parseHoraireMinutes(horaireDebut ?? DEFAULT_HORAIRE.debut);
  if (expected === null) return 0;
  const actual = checkIn.getHours() * 60 + checkIn.getMinutes();
  return Math.max(0, actual - expected);
}

export async function listEmployees(filters?: {
  departement?: string;
  statut?: string;
  q?: string;
  trash?: boolean;
}) {
  const where: Record<string, unknown> = {
    archived: filters?.trash === true,
  };
  if (filters?.departement && filters.departement !== 'tous') where.departement = filters.departement;
  if (filters?.statut && filters.statut !== 'tous') where.statut = filters.statut;
  else if (!filters?.statut && !filters?.trash) where.statut = 'Actif';

  const q = filters?.q?.trim();
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { matricule: { contains: q } },
      { poste: { contains: q } },
      { tel: { contains: q } },
      { departement: { contains: q } },
    ];
  }

  return prisma.employee.findMany({
    where,
    orderBy: [{ departement: 'asc' }, { lastName: 'asc' }],
    include: {
      presences: {
        where: { date: { gte: startOfDay() } },
        take: 1,
      },
    },
  });
}

export async function getEmployeeById(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: {
      presences: { orderBy: { date: 'desc' }, take: 14 },
      absences: { orderBy: { dateDebut: 'desc' }, take: 10 },
    },
  });
}

export async function getEmployeeByUserId(userId: string) {
  return prisma.employee.findUnique({ where: { userId } });
}

/** Résout la fiche employé — userId lié ou matricule session v29 */
export async function getEmployeeForSession(userId: string, matricule?: string | null) {
  const byUser = await getEmployeeByUserId(userId);
  if (byUser) return byUser;
  if (matricule) {
    return prisma.employee.findUnique({ where: { matricule: matricule.toUpperCase() } });
  }
  return null;
}

export async function createEmployee(data: {
  matricule: string;
  firstName: string;
  lastName: string;
  poste: string;
  departement?: string;
  authRole?: string;
  email?: string | null;
  tel?: string | null;
  site?: string;
  horaireDebut?: string | null;
  horaireFin?: string | null;
  userId?: string | null;
  notes?: string | null;
}) {
  return prisma.employee.create({
    data: {
      matricule: data.matricule.trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      poste: data.poste.trim(),
      departement: data.departement ?? 'Production',
      authRole: data.authRole ?? 'production',
      email: data.email?.trim() || null,
      tel: data.tel?.trim() || null,
      site: data.site ?? 'AX0',
      horaireDebut: data.horaireDebut ?? DEFAULT_HORAIRE.debut,
      horaireFin: data.horaireFin ?? DEFAULT_HORAIRE.fin,
      userId: data.userId ?? null,
      notes: data.notes?.trim() || null,
      dateEmbauche: new Date(),
    },
  });
}

export async function updateEmployee(
  id: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    poste: string;
    departement: string;
    authRole: string;
    email: string | null;
    tel: string | null;
    site: string;
    statut: string;
    presenceStatut: string;
    horaireDebut: string | null;
    horaireFin: string | null;
    notes: string | null;
    bio: string | null;
    station: string | null;
    avatarColor: string | null;
    cantineHeure: string | null;
    salaireBaseMGA: number;
    notesFraisMGA: number;
    heuresSup: number;
    primeMGA: number;
    congeSolde: number;
  }>,
) {
  return prisma.employee.update({ where: { id }, data });
}

export async function checkInEmployee(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error('Employé introuvable');

  const today = startOfDay();
  const now = new Date();
  const retardMin = computeRetardMin(now, employee.horaireDebut);
  const statut = retardMin > 0 ? 'Retard' : 'Présent';

  const presence = await prisma.employeePresence.upsert({
    where: { employeeId_date: { employeeId, date: today } },
    create: { employeeId, date: today, checkIn: now, statut, retardMin },
    update: { checkIn: now, statut, retardMin },
  });

  await prisma.employee.update({
    where: { id: employeeId },
    data: { presenceStatut: 'Présent' },
  });

  return presence;
}

export async function checkOutEmployee(employeeId: string) {
  const today = startOfDay();
  const presence = await prisma.employeePresence.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });
  if (!presence?.checkIn) throw new Error('Aucun pointage entrée aujourd\'hui');

  return prisma.employeePresence.update({
    where: { id: presence.id },
    data: { checkOut: new Date() },
  });
}

export async function justifyRetard(presenceId: string, cause: string, remarque?: string) {
  return prisma.employeePresence.update({
    where: { id: presenceId },
    data: {
      cause: cause.trim(),
      remarque: remarque?.trim() || null,
      statut: 'Justifié',
    },
  });
}

export async function listPresences(filters?: { date?: Date; employeeId?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.employeeId) where.employeeId = filters.employeeId;
  if (filters?.date) where.date = startOfDay(filters.date);

  return prisma.employeePresence.findMany({
    where,
    orderBy: { checkIn: 'desc' },
    include: {
      employee: {
        select: { id: true, matricule: true, firstName: true, lastName: true, poste: true, departement: true },
      },
    },
    take: 100,
  });
}

export async function listAbsences(filters?: { statut?: string; employeeId?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.statut && filters.statut !== 'tous') where.statut = filters.statut;
  if (filters?.employeeId) where.employeeId = filters.employeeId;

  return prisma.employeeAbsence.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      employee: {
        select: { id: true, matricule: true, firstName: true, lastName: true, poste: true, departement: true },
      },
    },
    take: 100,
  });
}

export async function createAbsenceRequest(data: {
  employeeId: string;
  type: string;
  dateDebut: Date;
  dateFin: Date;
  motif?: string | null;
}) {
  const absence = await prisma.employeeAbsence.create({
    data: {
      employeeId: data.employeeId,
      type: data.type,
      dateDebut: data.dateDebut,
      dateFin: data.dateFin,
      motif: data.motif?.trim() || null,
    },
    include: { employee: { select: { firstName: true, lastName: true } } },
  });

  await prisma.employee.update({
    where: { id: data.employeeId },
    data: { presenceStatut: 'Congé' },
  });

  return absence;
}

export async function reviewAbsence(id: string, statut: 'Validé' | 'Refusé', reviewedBy: string) {
  const absence = await prisma.employeeAbsence.update({
    where: { id },
    data: { statut, reviewedBy, reviewedAt: new Date() },
    include: { employee: true },
  });

  if (statut === 'Refusé') {
    await prisma.employee.update({
      where: { id: absence.employeeId },
      data: { presenceStatut: 'Absent' },
    });
  }

  return absence;
}

export async function listRhAnnouncements(limit = 30) {
  const now = new Date();
  return prisma.rhAnnouncement.findMany({
    where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
}

export async function createRhAnnouncement(data: {
  title: string;
  content: string;
  priority?: string;
  authorName: string;
  authorId?: string | null;
  pinned?: boolean;
  expiresAt?: Date | null;
}) {
  return prisma.rhAnnouncement.create({
    data: {
      title: data.title.trim(),
      content: data.content.trim(),
      priority: data.priority ?? 'Normal',
      authorName: data.authorName,
      authorId: data.authorId ?? null,
      pinned: data.pinned ?? false,
      expiresAt: data.expiresAt ?? null,
    },
  });
}

export async function getRhStats() {
  const today = startOfDay();

  const [totalActifs, presentsToday, retardsToday, absencesPending, announcements, presentNow] =
    await Promise.all([
      prisma.employee.count({ where: { statut: 'Actif' } }),
      prisma.employeePresence.count({
        where: { date: today, statut: { in: ['Présent', 'Retard', 'Justifié'] } },
      }),
      prisma.employeePresence.count({ where: { date: today, statut: 'Retard' } }),
      prisma.employeeAbsence.count({ where: { statut: 'En attente' } }),
      prisma.rhAnnouncement.count({
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      }),
      prisma.employee.count({ where: { statut: 'Actif', presenceStatut: 'Présent' } }),
    ]);

  return { totalActifs, presentsToday, retardsToday, absencesPending, announcements, presentNow };
}

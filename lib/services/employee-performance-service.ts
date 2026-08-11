import { prisma } from '@/lib/prisma';

export type PerformanceRow = {
  id: string;
  matricule: string;
  name: string;
  poste: string;
  departement: string;
  ponctualite: number;
  qualite: number;
  consignes: number;
  total: number;
  color: string;
  evaluated: boolean;
};

const DEPT_COLORS: Record<string, string> = {
  Production: '#1565c0',
  Commercial: '#00838f',
  'Studio Création': '#7b1fa2',
  Studio: '#7b1fa2',
  Logistique: '#ef6c00',
  Direction: '#cc0033',
  Accueil: '#0891b2',
  Administration: '#475569',
  Communication: '#db2777',
  Qualité: '#16a34a',
  Technique: '#2563eb',
  Finance: '#ca8a04',
  RH: '#2e7d32',
};

function colorForDept(dept: string) {
  return DEPT_COLORS[dept] ?? '#64748b';
}

/** Max théorique : 7 + 7 + 7 */
export const PERF_SCORE_MAX = 21;

export async function listPerformanceRows(search?: string): Promise<PerformanceRow[]> {
  const q = search?.trim();
  const employees = await prisma.employee.findMany({
    where: {
      statut: 'Actif',
      ...(q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { matricule: { contains: q } },
              { poste: { contains: q } },
              { departement: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      evaluations: { where: { period: 'current' }, take: 1 },
    },
    orderBy: [{ lastName: 'asc' }],
  });

  return employees.map((e) => {
    const ev = e.evaluations[0];
    const p = ev?.ponctualite ?? 0;
    const qv = ev?.qualite ?? 0;
    const c = ev?.consignes ?? 0;
    return {
      id: e.id,
      matricule: e.matricule,
      name: `${e.firstName} ${e.lastName}`,
      poste: e.poste,
      departement: e.departement,
      ponctualite: p,
      qualite: qv,
      consignes: c,
      total: p + qv + c,
      color: colorForDept(e.departement),
      evaluated: Boolean(ev),
    };
  });
}

export async function upsertEvaluation(
  employeeId: string,
  data: { ponctualite: number; qualite: number; consignes: number; notes?: string | null; evaluatedBy?: string },
) {
  return prisma.employeeEvaluation.upsert({
    where: { employeeId_period: { employeeId, period: 'current' } },
    create: {
      employeeId,
      ponctualite: data.ponctualite,
      qualite: data.qualite,
      consignes: data.consignes,
      notes: data.notes ?? null,
      evaluatedBy: data.evaluatedBy ?? null,
      period: 'current',
    },
    update: {
      ponctualite: data.ponctualite,
      qualite: data.qualite,
      consignes: data.consignes,
      notes: data.notes ?? null,
      evaluatedBy: data.evaluatedBy ?? null,
    },
  });
}

export async function getLeaderboard(limit = 5) {
  const rows = await listPerformanceRows();
  return [...rows]
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (a.evaluated !== b.evaluated) return a.evaluated ? -1 : 1;
      return a.name.localeCompare(b.name, 'fr');
    })
    .slice(0, limit);
}

export async function getEmployeePerformance(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { evaluations: { where: { period: 'current' }, take: 1 } },
  });
  if (!employee) return null;
  const ev = employee.evaluations[0];
  const all = await listPerformanceRows();
  const rank = [...all].sort((a, b) => b.total - a.total).findIndex((r) => r.id === employeeId) + 1;
  return {
    employee,
    ponctualite: ev?.ponctualite ?? 0,
    qualite: ev?.qualite ?? 0,
    consignes: ev?.consignes ?? 0,
    total: (ev?.ponctualite ?? 0) + (ev?.qualite ?? 0) + (ev?.consignes ?? 0),
    rank: rank || all.length,
  };
}

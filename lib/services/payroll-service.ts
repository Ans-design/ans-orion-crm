import { prisma } from '@/lib/prisma';
import { computeFiscalDeductions } from '@/lib/fiscal-config';
import { getFiscalConfig } from '@/lib/services/fiscal-config-service';
import { getPendingAdvanceTotal } from '@/lib/services/employee-advance-service';

export async function getHsRateMGA() {
  const fiscal = await getFiscalConfig();
  return fiscal.hsRateMGA;
}

export function computeNetPayroll(
  emp: {
    salaireBaseMGA: number;
    notesFraisMGA: number;
    heuresSup: number;
    primeMGA: number;
  },
  hsRateMGA: number,
) {
  const hsAmount = emp.heuresSup * hsRateMGA;
  const brut = emp.salaireBaseMGA + emp.notesFraisMGA + hsAmount + emp.primeMGA;
  return { hsAmount, brut, net: brut };
}

export async function computeNetPayrollWithDeductions(
  emp: {
    id: string;
    salaireBaseMGA: number;
    notesFraisMGA: number;
    heuresSup: number;
    primeMGA: number;
  },
) {
  const fiscal = await getFiscalConfig();
  const { hsAmount, brut } = computeNetPayroll(emp, fiscal.hsRateMGA);
  const advances = await getPendingAdvanceTotal(emp.id);
  const deductions = computeFiscalDeductions(brut, fiscal);
  const net = Math.max(0, brut - deductions.total - advances);
  return { hsAmount, brut, net, deductions, advances, fiscal };
}

export async function getPayrollGrid() {
  const employees = await prisma.employee.findMany({
    where: { statut: 'Actif' },
    orderBy: [{ departement: 'asc' }, { lastName: 'asc' }],
  });

  const fiscal = await getFiscalConfig();

  const rows = await Promise.all(
    employees.map(async (e) => {
      const computed = await computeNetPayrollWithDeductions(e);
      return {
        id: e.id,
        matricule: e.matricule,
        name: `${e.firstName} ${e.lastName}`,
        poste: e.poste,
        departement: e.departement,
        salaireBaseMGA: e.salaireBaseMGA,
        notesFraisMGA: e.notesFraisMGA,
        heuresSup: e.heuresSup,
        hsAmount: computed.hsAmount,
        primeMGA: e.primeMGA,
        brutMGA: computed.brut,
        cotisationsMGA: computed.deductions.total,
        avancesMGA: computed.advances,
        netMGA: computed.net,
      };
    }),
  );

  const stats = {
    masseSalariale: rows.reduce((s, r) => s + r.netMGA, 0),
    masseBrute: rows.reduce((s, r) => s + r.brutMGA, 0),
    cotisationsTotal: rows.reduce((s, r) => s + r.cotisationsMGA, 0),
    avancesTotal: rows.reduce((s, r) => s + r.avancesMGA, 0),
    heuresSupTotal: rows.reduce((s, r) => s + r.heuresSup, 0),
    notesFraisTotal: rows.reduce((s, r) => s + r.notesFraisMGA, 0),
    primesTotal: rows.reduce((s, r) => s + r.primeMGA, 0),
    fiscal,
  };

  return { rows, stats };
}

export async function updateEmployeePayroll(
  employeeId: string,
  data: Partial<{
    salaireBaseMGA: number;
    notesFraisMGA: number;
    heuresSup: number;
    primeMGA: number;
    cantineHeure: string;
  }>,
) {
  return prisma.employee.update({ where: { id: employeeId }, data });
}

function currentPayrollPeriod(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function getPayslipPreview(employeeId: string, period = currentPayrollPeriod()) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return null;

  const existing = await prisma.payslip.findUnique({
    where: { employeeId_period: { employeeId, period } },
  });

  const computed = await computeNetPayrollWithDeductions(employee);
  const { fiscal, deductions, advances, brut, net } = computed;

  if (existing) return { employee, payslip: existing, fiscal };

  const lines = [
    { designation: 'Salaire de base', base: '—', taux: '—', montant: `${employee.salaireBaseMGA.toLocaleString('fr-FR')} ${fiscal.currency}` },
    ...(employee.heuresSup > 0
      ? [{ designation: 'Heures supplémentaires', base: `${employee.heuresSup} h`, taux: `${fiscal.hsRateMGA.toLocaleString('fr-FR')}`, montant: `${computed.hsAmount.toLocaleString('fr-FR')} ${fiscal.currency}` }]
      : []),
    ...(employee.notesFraisMGA > 0
      ? [{ designation: 'Notes de frais', base: '—', taux: '—', montant: `${employee.notesFraisMGA.toLocaleString('fr-FR')} ${fiscal.currency}` }]
      : []),
    ...(employee.primeMGA > 0
      ? [{ designation: 'Prime', base: '—', taux: '—', montant: `${employee.primeMGA.toLocaleString('fr-FR')} ${fiscal.currency}` }]
      : []),
    { designation: 'TOTAL BRUT', base: '', taux: '', montant: `${brut.toLocaleString('fr-FR')} ${fiscal.currency}` },
    { designation: fiscal.labelCnaps, base: `${fiscal.cnapsRate}%`, taux: '—', montant: `-${deductions.cnaps.toLocaleString('fr-FR')} ${fiscal.currency}` },
    { designation: fiscal.labelOstie, base: `${fiscal.ostieRate}%`, taux: '—', montant: `-${deductions.ostie.toLocaleString('fr-FR')} ${fiscal.currency}` },
    { designation: 'FMFP', base: `${fiscal.fmfpRate}%`, taux: '—', montant: `-${deductions.fmfp.toLocaleString('fr-FR')} ${fiscal.currency}` },
    { designation: 'IRSA', base: `${fiscal.irsaRate}%`, taux: '—', montant: `-${deductions.irsa.toLocaleString('fr-FR')} ${fiscal.currency}` },
    ...(advances > 0
      ? [{ designation: 'Avance sur salaire', base: '—', taux: '—', montant: `-${advances.toLocaleString('fr-FR')} ${fiscal.currency}` }]
      : []),
    { designation: 'NET À PAYER', base: '', taux: '', montant: `${net.toLocaleString('fr-FR')} ${fiscal.currency}` },
  ];

  return {
    employee,
    fiscal,
    payslip: {
      period,
      paymentDate: new Date(),
      currency: fiscal.currency,
      brutAmount: brut,
      netAmount: net,
      lines,
      companyMeta: {
        name: 'ANS DESIGN PRINT',
        adresse: 'Antananarivo, Madagascar',
        siret: '—',
      },
      employeeMeta: {
        name: `${employee.firstName} ${employee.lastName}`,
        emploi: employee.poste,
        anciennete: employee.dateEmbauche?.toLocaleDateString('fr-FR') ?? '—',
        periode: period,
        paiement: 'Virement',
      },
    },
  };
}

export async function seedEmployeePayrollDefaults() {
  const employees = await prisma.employee.findMany();
  const salaries = [850000, 620000, 580000, 520000, 480000, 550000];
  for (let i = 0; i < employees.length; i++) {
    const e = employees[i];
    if (e.salaireBaseMGA > 0) continue;
    await prisma.employee.update({
      where: { id: e.id },
      data: {
        salaireBaseMGA: salaries[i % salaries.length],
        notesFraisMGA: i === 1 ? 85000 : i === 3 ? 42000 : 0,
        heuresSup: i === 3 ? 12 : i === 4 ? 8 : 0,
        primeMGA: i === 0 ? 150000 : i === 2 ? 75000 : 0,
        avatarColor: ['#F20A3A', '#00CFFF', '#FF4A2B', '#1565c0', '#ef6c00', '#FFC928'][i % 6],
        station: ['Direction', 'Bureau commercial', 'Studio', 'Atelier presse', 'Logistique', 'Caisse'][i % 6],
      },
    });
  }
}

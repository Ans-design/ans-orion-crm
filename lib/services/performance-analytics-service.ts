import { prisma } from '@/lib/prisma';
import { listPerformanceRows } from '@/lib/services/employee-performance-service';
import { PRISMA_MACHINE_STATUS_MAP } from '@/lib/dashboard/chart-theme';

export type ChartPoint = { name: string; value: number; color?: string };

export type MachinePerformanceCharts = {
  utilization: ChartPoint[];
  slotsByMachine: ChartPoint[];
  statusBreakdown: ChartPoint[];
  avgUtilization: number;
  totalSlots: number;
};

export type EmployeePerformanceCharts = {
  scores: ChartPoint[];
  byDepartment: ChartPoint[];
  topPerformers: ChartPoint[];
  avgScore: number;
  activeCount: number;
};

export type PerformanceAnalyticsPayload = {
  machines: MachinePerformanceCharts;
  employees: EmployeePerformanceCharts;
  generatedAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  disponible: '#19C37D',
  en_production: '#FF8A00',
  maintenance: '#FFB21A',
  en_attente: '#E86F00',
  hors_service: '#FF3B5C',
};

const DEPT_COLORS: Record<string, string> = {
  Production: '#E7194F',
  Commercial: '#FF8A00',
  Studio: '#FFB21A',
  Logistique: '#E86F00',
  Direction: '#C91443',
  RH: '#0E9F6E',
};

function thirtyDaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

export async function getPerformanceAnalytics(): Promise<PerformanceAnalyticsPayload> {
  const since = thirtyDaysAgo();

  const [machines, slots, employeeRows] = await Promise.all([
    prisma.machine.findMany({ orderBy: { name: 'asc' } }),
    prisma.productionSlot.findMany({
      where: {
        startAt: { gte: since },
        statut: { not: 'Annulé' },
      },
      select: { machine: true, statut: true },
    }),
    listPerformanceRows(),
  ]);

  const utilization: ChartPoint[] = machines.map((m) => ({
    name: m.name,
    value: m.utilization,
    color: m.utilization >= 80 ? '#E7194F' : m.utilization >= 50 ? '#FF8A00' : '#19C37D',
  }));

  const slotMap = new Map<string, number>();
  for (const slot of slots) {
    const key = slot.machine?.trim() || 'Non assigné';
    slotMap.set(key, (slotMap.get(key) ?? 0) + 1);
  }
  const slotsByMachine: ChartPoint[] = Array.from(slotMap.entries())
    .map(([name, value]) => ({ name, value, color: '#06B6D4' }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const statusBuckets = new Map<string, number>();
  for (const m of machines) {
    const semantic = PRISMA_MACHINE_STATUS_MAP[m.status] ?? 'disponible';
    statusBuckets.set(semantic, (statusBuckets.get(semantic) ?? 0) + 1);
  }
  const statusBreakdown: ChartPoint[] = Array.from(statusBuckets.entries()).map(([status, value]) => ({
    name: status.replace(/_/g, ' '),
    value,
    color: STATUS_COLORS[status] ?? '#94A3B8',
  }));

  const avgUtilization = machines.length
    ? Math.round(machines.reduce((s, m) => s + m.utilization, 0) / machines.length)
    : 0;

  const scores: ChartPoint[] = employeeRows
    .filter((r) => r.total !== 0)
    .map((r) => ({ name: r.name, value: r.total, color: r.color }))
    .sort((a, b) => b.value - a.value);

  const deptMap = new Map<string, { sum: number; count: number }>();
  for (const r of employeeRows) {
    const cur = deptMap.get(r.departement) ?? { sum: 0, count: 0 };
    cur.sum += r.total;
    cur.count += 1;
    deptMap.set(r.departement, cur);
  }
  const byDepartment: ChartPoint[] = Array.from(deptMap.entries()).map(([name, { sum, count }]) => ({
    name,
    value: count ? Math.round((sum / count) * 10) / 10 : 0,
    color: DEPT_COLORS[name] ?? '#37474f',
  }));

  const topPerformers = scores.slice(0, 5);
  const scored = employeeRows.filter((r) => r.total !== 0);
  const avgScore = scored.length
    ? Math.round((scored.reduce((s, r) => s + r.total, 0) / scored.length) * 10) / 10
    : 0;

  return {
    machines: {
      utilization,
      slotsByMachine,
      statusBreakdown,
      avgUtilization,
      totalSlots: slots.length,
    },
    employees: {
      scores,
      byDepartment,
      topPerformers,
      avgScore,
      activeCount: employeeRows.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

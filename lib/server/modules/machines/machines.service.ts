import { prisma } from '@/lib/prisma';
import { applyTextSearchWhere } from '@/lib/server/search/text-search';

export type MachineListQuery = {
  status?: string;
  category?: string;
  search?: string;
  trash?: boolean;
};

export type CreateMachineInput = {
  code: string;
  name: string;
  category?: 'impression' | 'finition' | 'decoupe';
  status?: 'ok' | 'running' | 'waiting' | 'maintenance' | 'down';
  utilization?: number;
  nextMaintenance?: string | null;
  notes?: string | null;
};

export async function listMachines(query: MachineListQuery & { take?: number }) {
  const where: Record<string, unknown> = {
    archived: query.trash === true,
  };
  if (query.status) where.status = query.status;
  if (query.category) where.category = query.category;
  applyTextSearchWhere(where, query.search, ['code', 'name', 'category']);

  return prisma.machine.findMany({
    where,
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    take: Math.min(200, Math.max(1, query.take ?? 100)),
  });
}

export async function createMachineRecord(input: CreateMachineInput) {
  return prisma.machine.create({
    data: {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      category: input.category ?? 'impression',
      status: input.status ?? 'ok',
      utilization: input.utilization ?? 0,
      nextMaintenance: input.nextMaintenance ? new Date(input.nextMaintenance) : null,
      notes: input.notes ?? null,
    },
  });
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { z } from 'zod';
import { createMachineRecord, listMachines } from '@/lib/server/modules/machines/machines.service';
import { created, ok } from '@/lib/server/http/api-response';
import { stripMachineRecordForRole } from '@/lib/auth/machine-finance-access';

const createMachineSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  category: z.enum(['impression', 'finition', 'decoupe']).optional(),
  status: z.enum(['ok', 'running', 'waiting', 'maintenance', 'down']).optional(),
  utilization: z.number().int().min(0).max(100).optional(),
  nextMaintenance: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await requirePermission('production:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('machines GET', async () => {
    const { searchParams } = req.nextUrl;
    const take = Number(searchParams.get('limit') || searchParams.get('take') || 100);
    const machines = await listMachines({
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      trash: searchParams.get('archived') === '1' || searchParams.get('trash') === '1',
      take: Number.isFinite(take) ? take : 100,
    });
    return ok(machines.map((m) => stripMachineRecordForRole(m, auth.role)));
  }, { fallbackResponse: { ok: true, data: [] } });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('production:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('machines POST', async (): Promise<Response> => {
    const parsed = parseBody(createMachineSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const machine = await createMachineRecord(parsed.data);
    return created(machine);
  });
}

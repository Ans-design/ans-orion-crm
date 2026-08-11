export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { z } from 'zod';
import { resolveParams } from '@/lib/api/route-params';
import { stripMachineRecordForRole } from '@/lib/auth/machine-finance-access';
import { canViewMargin } from '@/lib/auth/margin-access';

const updateMachineSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  category: z.enum(['impression', 'finition', 'decoupe']).optional(),
  status: z.enum(['ok', 'running', 'waiting', 'maintenance', 'down']).optional(),
  utilization: z.number().int().min(0).max(100).optional(),
  nextMaintenance: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('production:read');
  if ('error' in auth) return auth.error;

  try {
    const machine = await prisma.machine.findUnique({ where: { id: id } });
    if (!machine) return apiError('Machine introuvable', 404);
    return NextResponse.json(stripMachineRecordForRole(machine, auth.role));
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur chargement machine'), 500);
  }
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('production:write');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseOr400(updateMachineSchema, await req.json());
    if ('error' in parsed) return parsed.error;

    if (parsed.data.notes !== undefined && !canViewMargin(auth.role)) {
      const existing = await prisma.machine.findUnique({ where: { id } });
      if (existing?.notes) {
        const { parseMachineNotes, serializeMachineNotes } = await import('@/lib/gpao-meta');
        const incoming = parseMachineNotes(parsed.data.notes);
        const kept = parseMachineNotes(existing.notes);
        parsed.data.notes = serializeMachineNotes({
          ...incoming,
          finance: kept.finance,
        });
      }
    }

    const { nextMaintenance, ...rest } = parsed.data;
    const machine = await prisma.machine.update({
      where: { id: id },
      data: {
        ...rest,
        ...(nextMaintenance !== undefined
          ? { nextMaintenance: nextMaintenance ? new Date(nextMaintenance) : null }
          : {}),
      },
    });
    return NextResponse.json(stripMachineRecordForRole(machine, auth.role));
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur mise à jour machine'), 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('production:write');
  if ('error' in auth) return auth.error;

  try {
    await prisma.machine.delete({ where: { id: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur suppression machine'), 500);
  }
}

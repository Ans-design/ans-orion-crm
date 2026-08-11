export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { z } from 'zod';
import { resolveParams } from '@/lib/api/route-params';

const updateReclamationSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).optional().nullable(),
  statut: z.enum(['Ouverte', 'En cours', 'Résolue', 'Clôturée']).optional(),
  priorite: z.enum(['Basse', 'Normale', 'Haute', 'Urgente']).optional(),
});

async function updateReclamation(req: NextRequest, id: string) {
  const parsed = parseOr400(updateReclamationSchema, await req.json());
  if ('error' in parsed) return parsed.error;

  const reclamation = await prisma.clientReclamation.update({
    where: { id },
    data: parsed.data,
    include: { client: { select: { id: true, name: true, code: true } } },
  });
  return NextResponse.json(reclamation);
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('clients:write');
  if ('error' in auth) return auth.error;

  try {
    return await updateReclamation(req, id);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur mise à jour réclamation'), 500);
  }
}

/** Alias — la fiche SAV utilise PATCH pour le statut. */
export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  return PUT(req, ctx);
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('clients:write');
  if ('error' in auth) return auth.error;

  try {
    await prisma.clientReclamation.delete({ where: { id: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur suppression réclamation'), 500);
  }
}

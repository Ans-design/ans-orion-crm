export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';
import { updateMaterielSchema } from '@/lib/server/modules/materiels/materiels.validation';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = await requirePermission('production:read');
  if ('error' in auth) return auth.error;

  const { id } = await resolveParams(ctx.params);

  return runApiHandler('materiels GET id', async () => {
    const item = await prisma.equipment.findUnique({
      where: { id },
      include: {
        employee: true,
        tickets: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!item) return apiError('Matériel introuvable', 404);
    return NextResponse.json(item);
  });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = await requirePermission('production:write');
  if ('error' in auth) return auth.error;

  const { id } = await resolveParams(ctx.params);

  const parsed = parseBody(updateMaterielSchema, await req.json());
  if (!parsed.ok) return apiError(parsed.error, 400);

  try {
    const body = parsed.data;
    const data: Record<string, unknown> = { ...body };
    if (body.prochaineMaint !== undefined) {
      data.prochaineMaint = body.prochaineMaint ? new Date(body.prochaineMaint) : null;
    }
    const item = await prisma.equipment.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur mise à jour matériel'), 500);
  }
}

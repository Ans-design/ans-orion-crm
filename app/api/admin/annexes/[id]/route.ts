export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { getSiteStats, updateSiteAnnexe } from '@/lib/services/annex-service';
import { resolveParams } from '@/lib/api/route-params';

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  adresse: z.string().max(300).optional().nullable(),
  ville: z.string().max(100).optional().nullable(),
  tel: z.string().max(30).optional().nullable(),
  statut: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  try {
    const annexe = await import('@/lib/prisma').then(({ prisma }) =>
      prisma.siteAnnexe.findUnique({ where: { id: id } }),
    );
    if (!annexe) return apiError('Annexe introuvable', 404);

    const stats = await getSiteStats(annexe.code);
    const employees = await import('@/lib/prisma').then(({ prisma }) =>
      prisma.employee.findMany({
        where: { site: annexe.code, statut: 'Actif' },
        select: { id: true, matricule: true, firstName: true, lastName: true, poste: true },
      }),
    );

    return NextResponse.json({ ...annexe, stats, employees });
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur annexe'), 500);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseOr400(patchSchema, await req.json());
    if ('error' in parsed) return parsed.error;

    const annexe = await updateSiteAnnexe(id, parsed.data);
    return NextResponse.json(annexe);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur mise à jour annexe'), 500);
  }
}

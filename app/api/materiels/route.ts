export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { created, ok } from '@/lib/server/http/api-response';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { parseBody } from '@/lib/server/validation/common';
import { createMaterielSchema } from '@/lib/server/modules/materiels/materiels.validation';

const EMPTY_MATERIELS = {
  items: [],
  stats: { total: 0, affectes: 0, disponibles: 0, panne: 0, maintenance: 0 },
};

export const GET = withAuthApi(
  'materiels GET',
  async (_auth, req: NextRequest) => {
    const q = req.nextUrl.searchParams;
    const category = q.get('category');
    const etat = q.get('etat');
    const employeeId = q.get('employeeId');
    const site = q.get('site');

    const take = Math.min(200, Math.max(1, Number(q.get('limit') || 100)));
    const trash = q.get('archived') === '1' || q.get('trash') === '1';
    const items = await prisma.equipment.findMany({
      where: {
        archived: trash,
        ...(category ? { category } : {}),
        ...(etat ? { etat } : {}),
        ...(employeeId ? { employeeId } : {}),
        ...(site ? { site } : {}),
      },
      include: {
        employee: { select: { id: true, matricule: true, firstName: true, lastName: true, poste: true } },
        tickets: { where: { statut: { notIn: ['Résolu', 'Clôturé'] } }, take: 3 },
      },
      orderBy: [{ etat: 'asc' }, { name: 'asc' }],
      take,
    });

    const stats = {
      total: items.length,
      affectes: items.filter((i: { etat: string }) => i.etat === 'affecte').length,
      disponibles: items.filter((i: { etat: string }) => i.etat === 'disponible').length,
      panne: items.filter((i: { etat: string }) => i.etat === 'panne').length,
      maintenance: items.filter((i: { etat: string }) => i.etat === 'maintenance').length,
    };

    return ok({ items, stats });
  },
  {
    permission: 'production:read',
    fallbackResponse: { ok: true, data: EMPTY_MATERIELS },
  },
);

export async function POST(req: NextRequest) {
  return withAuthApi(
    'materiels POST',
    async (_auth, request) => {
      const parsed = parseBody(createMaterielSchema, await request.json(), 'materiels POST');
      if (!parsed.ok) return parsed.response;

      const item = await prisma.equipment.create({ data: parsed.data });
      return created(item);
    },
    { permission: 'production:write' },
  )(req);
}

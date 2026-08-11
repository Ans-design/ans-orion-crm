export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';

/** Liste légère employés actifs — sélecteurs SAV / déchets (hors RH admin). */
export async function GET() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  return runApiHandler('equipe/employes-options GET', async () => {
    const rows = await prisma.employee.findMany({
      where: { statut: 'Actif' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        poste: true,
        departement: true,
        matricule: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 300,
    });
    return NextResponse.json({
      items: rows.map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`.trim(),
        poste: e.poste,
        departement: e.departement,
        matricule: e.matricule,
      })),
    });
  }, { fallbackResponse: { items: [] } });
}

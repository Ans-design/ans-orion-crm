export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { ensureFactureForCommande } from '@/lib/services/facture-workflow-service';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';

export async function POST(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('factures:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('commandes/[id]/facture POST', async () => {
    const commande = await prisma.commande.findUnique({ where: { id: id } });
    if (!commande) return apiError('Commande introuvable', 404);

    const result = await ensureFactureForCommande(id, {
      userId: auth.userId,
      userName: auth.userName,
    });

    if ('error' in result) return apiError('Commande introuvable', 404);

    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  });
}

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireBatWrite } from '@/lib/server/auth/bat-access';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-response';
import { createBatClientAccessToken, batClientValidationPath } from '@/lib/bat/client-access-token';
import { runApiHandler } from '@/lib/api-guard';
import { syncGpaoOnProofStatus } from '@/lib/services/bat-gpao-sync';
import { syncCommandeOnProofStatus } from '@/lib/services/commande-module-sync';
import { resolveParams } from '@/lib/api/route-params';

type Ctx = { params: { id: string } | Promise<{ id: string }> };

/** Génère un lien public de validation BAT pour le client (30 jours). */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireBatWrite();
  if ('error' in auth) return auth.error;

  return runApiHandler('proofs/[id]/client-link POST', async () => {
    const proof = await prisma.proof.findUnique({ where: { id } });
    if (!proof) return apiError('BAT introuvable', 404);

    const token = createBatClientAccessToken(proof.id);
    const origin = (
      process.env.NEXTAUTH_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    ).replace(/\/$/, '');
    const path = batClientValidationPath(token);
    const url = `${origin}${path}`;

    if (proof.statut === 'En attente fichier') {
      const nextStatut = 'En attente validation client';
      await prisma.proof.update({
        where: { id: proof.id },
        data: { statut: nextStatut, sentAt: new Date() },
      });
      if (proof.commandeId) {
        await syncGpaoOnProofStatus(proof.commandeId, nextStatut).catch((err) => {
          console.error('[client-link] syncGpaoOnProofStatus:', err);
        });
        await syncCommandeOnProofStatus(proof.commandeId, nextStatut, {
          userId: auth.userId,
          userName: auth.userName,
        }).catch((err) => {
          console.error('[client-link] syncCommandeOnProofStatus:', err);
        });
      }
    }

    return NextResponse.json({ url, path, token, expiresInDays: 30 });
  });
}

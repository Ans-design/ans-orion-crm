export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-response';
import { verifyBatClientAccessToken } from '@/lib/bat/client-access-token';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { syncCommandeOnProofStatus } from '@/lib/services/commande-module-sync';
import { syncGpaoOnProofStatus } from '@/lib/services/bat-gpao-sync';
import { runApiHandler } from '@/lib/api-guard';
import { parseBody } from '@/lib/validators/common';
import { batClientActionSchema } from '@/lib/validators/bat-client.validation';

const TERMINAL_BAT_STATUTS = ['Validé', 'Verrouillé', 'Refusé'];

type Ctx = { params: { token: string } };

export async function GET(_req: NextRequest, ctx: Ctx) {
  return runApiHandler('bat/client GET', async () => {
    const verified = verifyBatClientAccessToken(ctx.params.token);
    if (!verified) return apiError('Lien invalide ou expiré', 403);

    const proof = await prisma.proof.findUnique({
      where: { id: verified.proofId },
      include: {
        commande: {
          select: {
            numero: true,
            article: true,
            client: { select: { name: true } },
          },
        },
        client: { select: { name: true } },
        versions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!proof) return apiError('BAT introuvable', 404);

    let previewFile: { id: string; name: string; mimeType: string } | null = null;
    if (proof.fileAssetId) {
      const f = await prisma.fileAsset.findUnique({
        where: { id: proof.fileAssetId },
        select: { id: true, name: true, mimeType: true },
      });
      if (f) previewFile = f;
    }

    return NextResponse.json({
      numero: proof.numero,
      statut: proof.statut,
      locked: proof.locked,
      commentaireClient: proof.commentaireClient,
      clientName: proof.client?.name ?? proof.commande?.client?.name ?? 'Client',
      commandeNumero: proof.commande?.numero,
      article: proof.commande?.article,
      previewFile,
      canValidate: !proof.locked && !TERMINAL_BAT_STATUTS.includes(proof.statut),
    });
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = await checkRateLimitAsync(`bat-client:${ip}`, 10, 60_000);
  if (!rl.ok) return apiError('Trop de tentatives', 429);

  return runApiHandler('bat/client POST', async () => {
    const verified = verifyBatClientAccessToken(ctx.params.token);
    if (!verified) return apiError('Lien invalide ou expiré', 403);

    const parsed = parseBody(batClientActionSchema, await req.json().catch(() => ({})));
    if (!parsed.ok) return apiError(parsed.error, 400);

    const action = parsed.data.action === 'refuse' ? 'refuse' : 'accept';
    const commentaire = parsed.data.commentaire;
    const statut = action === 'accept' ? 'Validé' : 'Refusé';

    // Idempotence : retry après succès → même statut sans re-écriture
    const existing = await prisma.proof.findUnique({ where: { id: verified.proofId } });
    if (!existing) return apiError('BAT introuvable', 404);
    if (existing.locked || TERMINAL_BAT_STATUTS.includes(existing.statut)) {
      if (existing.statut === statut) {
        await syncGpaoOnProofStatus(existing.commandeId, statut).catch((err) => {
          console.error('[bat-client] syncGpao retry:', err);
        });
        return NextResponse.json({ ok: true, statut: existing.statut, idempotent: true });
      }
      return apiError('BAT déjà traité', 409);
    }

    const updated = await prisma.proof.update({
      where: { id: existing.id },
      data: {
        statut,
        locked: true,
        commentaireClient: commentaire || null,
        validatedAt: action === 'accept' ? new Date() : existing.validatedAt,
        validatedBy: 'Client (portail)',
      },
    });

    let syncIncomplete = false;
    try {
      await syncCommandeOnProofStatus(existing.commandeId, statut, { userName: 'Client (portail)' });
      await syncGpaoOnProofStatus(existing.commandeId, statut);
    } catch (err) {
      syncIncomplete = true;
      console.error('[bat-client] sync commande/GPAO:', err);
    }

    await logAudit({
      action: action === 'accept' ? 'BAT_CLIENT_VALIDATED' : 'BAT_CLIENT_REFUSED',
      entity: 'Proof',
      entityId: existing.id,
      entityLabel: existing.numero,
      details: { commentaire, ip, syncIncomplete },
    });

    return NextResponse.json({ ok: true, statut: updated.statut, syncIncomplete });
  });
}


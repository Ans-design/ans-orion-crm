export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBatRead, requireBatWrite } from '@/lib/server/auth/bat-access';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { logAudit } from '@/lib/audit';
import { createNotification } from '@/lib/services/notification-service';
import { syncGpaoOnProofStatus } from '@/lib/services/bat-gpao-sync';
import { syncCommandeOnProofStatus } from '@/lib/services/commande-module-sync';
import { BAT_STATUTS } from '@/lib/constants/file-assets';
import { z } from 'zod';
import { resolveParams } from '@/lib/api/route-params';

const updateProofSchema = z.object({
  statut: z.enum(BAT_STATUTS as unknown as [string, ...string[]]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  commentaireClient: z.string().max(2000).optional().nullable(),
  commentaireInterne: z.string().max(2000).optional().nullable(),
});

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireBatRead();
  if ('error' in auth) return auth.error;

  const proof = await prisma.proof.findUnique({
    where: { id: id },
    include: {
      commande: { select: { id: true, numero: true, client: { select: { name: true } } } },
      versions: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!proof) return apiError('BAT introuvable', 404);
  return NextResponse.json(proof);
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireBatWrite();
  if ('error' in auth) return auth.error;

  try {
    const existing = await prisma.proof.findUnique({ where: { id: id } });
    if (!existing) return apiError('BAT introuvable', 404);

    const parsed = parseOr400(updateProofSchema, await req.json());
    if ('error' in parsed) return parsed.error;

    if (existing.locked && parsed.data.statut && parsed.data.statut !== existing.statut) {
      return apiError('BAT verrouillé — modification du statut impossible', 403);
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.statut) {
      data.statut = parsed.data.statut;
      if (parsed.data.statut === 'Envoyé' || parsed.data.statut === 'En attente validation client') {
        data.sentAt = new Date();
      }
      if (parsed.data.statut === 'Validé' || parsed.data.statut === 'Verrouillé') {
        data.validatedAt = new Date();
        data.validatedBy = auth.userName;
        data.locked = true;
        if (parsed.data.statut === 'Verrouillé') data.statut = 'Verrouillé';
        else data.statut = 'Validé';
      }
      if (parsed.data.statut === 'Correction demandée') {
        data.locked = false;
      }
    }
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.commentaireClient !== undefined) data.commentaireClient = parsed.data.commentaireClient;
    if (parsed.data.commentaireInterne !== undefined) data.commentaireInterne = parsed.data.commentaireInterne;

    const proof = await prisma.proof.update({ where: { id: id }, data });

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'STATUS_CHANGE',
      entity: 'Proof',
      entityId: proof.id,
      entityLabel: proof.numero,
      details: parsed.data.statut,
    });

    if (parsed.data.statut) {
      await syncGpaoOnProofStatus(proof.commandeId, parsed.data.statut);
      await syncCommandeOnProofStatus(proof.commandeId, parsed.data.statut, {
        userId: auth.userId,
        userName: auth.userName,
      });

      const notifType =
        parsed.data.statut === 'Refusé' || parsed.data.statut === 'Correction demandée'
          ? 'warning'
          : parsed.data.statut === 'Validé' || parsed.data.statut === 'Verrouillé'
            ? 'success'
            : 'info';

      await createNotification({
        title: 'BAT mis à jour',
        message: `${proof.numero} → ${parsed.data.statut}`,
        link: proof.commandeId ? `/bat?commande=${proof.commandeId}` : '/bat',
        type: notifType,
        category: 'production',
      });

      if (parsed.data.statut === 'Validé' || parsed.data.statut === 'Verrouillé') {
        await createNotification({
          title: 'Production — BAT validé',
          message: `${proof.numero} validé — impression autorisée`,
          link: proof.commandeId ? `/production/dossiers?commande=${proof.commandeId}` : '/production/dossiers',
          type: 'success',
          category: 'production',
        });
      }
    }

    return NextResponse.json(proof);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur mise à jour BAT'), 500);
  }
}

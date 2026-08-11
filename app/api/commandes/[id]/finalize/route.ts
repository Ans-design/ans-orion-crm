export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { canWorkflowForce } from '@/lib/auth/permissions';
import { parseOr400 } from '@/lib/validators/parse';
import { resolveParams } from '@/lib/api/route-params';
import { runApiHandler } from '@/lib/api-guard';
import { finalizeCommandeWithClientFeedback } from '@/lib/services/commande-finalize-service';
import { createNotification } from '@/lib/services/notification-service';

const finalizeSchema = z.object({
  clientFeedback: z.string().min(3).max(4000),
  openReclamation: z.boolean().optional(),
  openTalk: z.boolean().optional(),
  priorite: z.enum(['Basse', 'Normale', 'Haute', 'Urgente']).optional(),
  force: z.boolean().optional(),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('commandes:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('commandes/[id]/finalize POST', async (): Promise<Response> => {
    const parsed = parseOr400(finalizeSchema, await req.json());
    if ('error' in parsed) {
      return parsed.error ?? apiError('Requête invalide', 400);
    }

    const wantsForce = Boolean(parsed.data.force);
    if (wantsForce && !canWorkflowForce(auth.role)) {
      return apiError('Override réservé à la direction (admin / manager)', 403);
    }

    try {
      const result = await finalizeCommandeWithClientFeedback(
        id,
        {
          clientFeedback: parsed.data.clientFeedback,
          openReclamation: parsed.data.openReclamation,
          openTalk: parsed.data.openTalk,
          priorite: parsed.data.priorite,
          force: wantsForce,
        },
        { userId: auth.userId, userName: auth.userName, force: wantsForce },
      );

      try {
        await createNotification({
          title: 'Commande finalisée',
          message: `${result.commande.numero} — retour client enregistré`,
          link: result.redirectTo,
          type: 'success',
          category: 'commandes',
        });
      } catch {
        // Non bloquant : la clôture est déjà persistée
      }

      return NextResponse.json({ success: true, ...result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'FINALIZE_ERROR';
      if (msg === 'NOT_FOUND') return apiError('Commande introuvable', 404);
      if (msg === 'CLIENT_REQUIRED') return apiError('Client manquant sur la commande', 400);
      if (msg === 'RETOUR_CLIENT_REQUIRED') {
        return apiError('Saisissez le retour du client (min. 3 caractères)', 400);
      }
      if (msg === 'FINALIZE_REQUIRES_PRETE_OR_LIVRE') {
        return apiError(
          'Retour client disponible uniquement quand la commande est Prête ou Livrée (pas en cours).',
          400,
        );
      }
      if (msg === 'FINALIZE_BLOCKED') {
        return apiError('Finalisation bloquée par le workflow — utilisez Forcer (direction) si besoin', 400);
      }
      if (msg.startsWith('SAV') || msg.startsWith('Stock') || msg.includes(' ')) {
        return apiError(msg, 400);
      }
      return apiError('Impossible de finaliser la commande', 500);
    }
  });
}

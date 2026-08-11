export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { canWorkflowForce } from '@/lib/auth/permissions';
import { parseOr400 } from '@/lib/validators/parse';
import { resolveParams } from '@/lib/api/route-params';
import {
  advanceCommandeJalon,
  bootstrapCommandeWorkflow,
  getCommandeWorkflowState,
  transitionCommandeStatut,
} from '@/lib/services/commande-workflow-service';
import { isCommandeStatut } from '@/lib/workflow/commande-workflow';
import { createNotification } from '@/lib/services/notification-service';
import { runApiHandler } from '@/lib/api-guard';

const workflowActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('jalon'),
    jalonId: z.string().min(1).max(80),
    force: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('statut'),
    statut: z.string().min(1).max(40),
    force: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('bootstrap'),
  }),
]);

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('commandes:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('commandes/[id]/workflow GET', async () => {
    const state = await getCommandeWorkflowState(id);
    if (!state) return apiError('Commande introuvable', 404);
    return NextResponse.json(state);
  });
}

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('commandes:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('commandes/[id]/workflow POST', async (): Promise<Response> => {
  const parsed = parseOr400(workflowActionSchema, await req.json());
  if ('error' in parsed) {
    return parsed.error ?? apiError('Requête invalide', 400);
  }

  const { type } = parsed.data;
  const wantsForce =
    parsed.data.type !== 'bootstrap' && Boolean(parsed.data.force);
  if (wantsForce && !canWorkflowForce(auth.role)) {
    return apiError('Override workflow réservé à la direction (admin / manager)', 403);
  }
  const userOpts = { userId: auth.userId, userName: auth.userName, force: wantsForce || undefined };

  if (type === 'bootstrap') {
    const result = await bootstrapCommandeWorkflow(id, userOpts);
    const state = await getCommandeWorkflowState(id);
    return NextResponse.json({ success: true, bootstrap: result, workflow: state });
  }

  if (type === 'jalon') {
    const result = await advanceCommandeJalon(id, parsed.data.jalonId, userOpts);
    if (result.error === 'NOT_FOUND') return apiError('Commande introuvable', 404);
    if (result.error === 'JALON_INCONNU') return apiError('Jalon workflow inconnu', 400);
    if (result.error === 'VALIDATION') {
      return apiError(result.validation.message, 400);
    }

    await createNotification({
      title: 'Workflow commande',
      message: `${result.commande.numero} — jalon « ${result.jalon.label} »`,
      link: `/commandes/${result.commande.id}`,
      type: 'info',
      category: 'commandes',
    });

    return NextResponse.json({ success: true, commande: result.commande, workflow: result.workflow });
  }

  if (!isCommandeStatut(parsed.data.statut)) {
    return apiError('Statut commande invalide', 400);
  }

  const result = await transitionCommandeStatut(id, parsed.data.statut, userOpts);
  if (result.error === 'NOT_FOUND') return apiError('Commande introuvable', 404);
  if (result.error === 'VALIDATION') {
    return apiError(result.validation.message, 400);
  }

  await createNotification({
    title: 'Commande mise à jour',
    message: `${result.commande.numero} → ${result.commande.statut}`,
    link: `/commandes/${result.commande.id}`,
    type: 'info',
    category: 'commandes',
  });

  return NextResponse.json({ success: true, commande: result.commande, workflow: result.workflow });
  });
}

import { CommandeStatut as CommandeStatutEnum } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createReclamationRecord } from '@/lib/server/modules/reclamations/reclamations.service';
import { createOrderConversation } from '@/lib/messaging/messaging-service';
import { advanceCommandeJalon, transitionCommandeStatut } from '@/lib/services/commande-workflow-service';
import { commandeStatutFromLabel, commandeStatutLabel } from '@/lib/server/data/prisma-statut-bridge';
import { logAudit } from '@/lib/audit';

function isAlreadyDelivered(statut: CommandeStatutEnum | string): boolean {
  if (statut === CommandeStatutEnum.Livre || statut === CommandeStatutEnum.Livree) return true;
  const label = commandeStatutLabel(statut);
  return label === 'Livré' || label === 'Livrée';
}

export type FinalizeCommandeInput = {
  clientFeedback: string;
  /** Créer une fiche réclamation pour évaluation SAV (défaut true). */
  openReclamation?: boolean;
  /** Créer / ouvrir le groupe ANS Talk participants (défaut true). */
  openTalk?: boolean;
  priorite?: 'Basse' | 'Normale' | 'Haute' | 'Urgente';
  force?: boolean;
};

export type FinalizeCommandeResult = {
  commande: { id: string; numero: string; statut: string; avancement: number };
  reclamation: { id: string; subject: string } | null;
  talkConversation: { id: string; name: string } | null;
  redirectTo: string;
};

/** Pure — testable. */
export function buildFinalizeRedirect(input: {
  commandeId: string;
  reclamationId?: string | null;
  talkId?: string | null;
}): string {
  const { commandeId, reclamationId, talkId } = input;
  if (reclamationId && talkId) {
    return `/reclamations?commande=${commandeId}&id=${reclamationId}&talk=${talkId}`;
  }
  if (reclamationId) return `/reclamations?commande=${commandeId}&id=${reclamationId}`;
  if (talkId) return `/messagerie?conv=${talkId}`;
  return `/commandes/${commandeId}`;
}

function appendFeedbackNote(existing: string | null | undefined, feedback: string, numero: string) {
  const stamp = new Date().toLocaleString('fr-FR');
  const block = `[Retour client ${stamp} — ${numero}]\n${feedback.trim()}`;
  if (!existing?.trim()) return block;
  if (existing.includes(feedback.trim())) return existing;
  return `${existing.trim()}\n\n${block}`;
}

function isBenignWorkflowBlock(result: { error?: string; validation?: { code?: string; message?: string } }) {
  if (result.error !== 'VALIDATION') return false;
  const code = result.validation?.code ?? '';
  const msg = (result.validation?.message ?? '').toLowerCase();
  return (
    code === 'JALON_DEJA_ATTEINT'
    || msg.includes('déjà atteint')
    || msg.includes('deja atteint')
  );
}

function workflowAttemptMessage(result: {
  error?: string;
  validation?: { message?: string };
}): string | undefined {
  if (result.error === 'VALIDATION') return result.validation?.message;
  return undefined;
}

/**
 * Pousse vers Livré via jalon puis statut.
 * « Déjà atteint » n’est jamais bloquant ; stock / qualité / etc. exigent `force`.
 */
async function ensureCommandeLivree(
  commandeId: string,
  auth: { userId: string; userName: string; force?: boolean },
) {
  const force = Boolean(auth.force);
  const jalon = await advanceCommandeJalon(commandeId, 'livree', {
    userId: auth.userId,
    userName: auth.userName,
    force,
  });

  if (!('error' in jalon)) return;
  if (jalon.error === 'NOT_FOUND') throw new Error('NOT_FOUND');

  const tr = await transitionCommandeStatut(commandeId, 'Livré', {
    userId: auth.userId,
    userName: auth.userName,
    force,
  });

  if (!('error' in tr)) return;
  if (tr.error === 'NOT_FOUND') throw new Error('NOT_FOUND');

  // Les deux voies disent « déjà fait » → OK (le update Prisma final aligne note / date).
  if (isBenignWorkflowBlock(jalon) && isBenignWorkflowBlock(tr)) return;
  if (isBenignWorkflowBlock(tr)) return;

  // Override direction : on laisse le update Prisma poser Livré.
  if (force) return;

  // Jalon déjà atteint mais transition métier bloquée (stock, qualité…) → bloquer.
  throw new Error(
    workflowAttemptMessage(tr)
      || workflowAttemptMessage(jalon)
      || 'FINALIZE_BLOCKED',
  );
}

async function upsertRetourClientReclamation(input: {
  clientId: string;
  commandeId: string;
  numero: string;
  feedback: string;
  priorite: 'Basse' | 'Normale' | 'Haute' | 'Urgente';
}) {
  // Ex. « Poste : Impression » → sujet SAV ciblé
  const posteMatch = input.feedback.match(/^Poste\s*:\s*(.+)$/m);
  const poste = posteMatch?.[1]?.trim();
  const subject = poste
    ? `Retour client — ${input.numero} · ${poste}`
    : `Retour client — ${input.numero}`;
  const existing = await prisma.clientReclamation.findFirst({
    where: {
      commandeId: input.commandeId,
      subject,
      statut: { in: ['Ouverte', 'En cours'] },
    },
    select: { id: true, subject: true },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) {
    await prisma.clientReclamation.update({
      where: { id: existing.id },
      data: {
        description: input.feedback,
        priorite: input.priorite,
      },
    });
    return existing;
  }
  const created = await createReclamationRecord({
    clientId: input.clientId,
    commandeId: input.commandeId,
    subject,
    description: input.feedback,
    priorite: input.priorite,
  });
  return { id: created.id, subject: created.subject };
}

export async function finalizeCommandeWithClientFeedback(
  commandeId: string,
  input: FinalizeCommandeInput,
  auth: { userId: string; userName: string; force?: boolean },
): Promise<FinalizeCommandeResult> {
  const feedback = input.clientFeedback.trim();
  if (feedback.length < 3) {
    throw new Error('RETOUR_CLIENT_REQUIRED');
  }

  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: {
      id: true,
      numero: true,
      statut: true,
      avancement: true,
      note: true,
      clientId: true,
      dateLiv: true,
    },
  });
  if (!commande) throw new Error('NOT_FOUND');
  if (!commande.clientId) throw new Error('CLIENT_REQUIRED');

  const statutLabel = commandeStatutLabel(commande.statut);
  const isPrete = statutLabel === 'Prête';
  const alreadyDelivered = isAlreadyDelivered(commande.statut);
  // Retour client uniquement sur commande finie (Prête / Livré) — pas en cours
  if (!isPrete && !alreadyDelivered && !(auth.force || input.force)) {
    throw new Error('FINALIZE_REQUIRES_PRETE_OR_LIVRE');
  }

  if (!alreadyDelivered) {
    await ensureCommandeLivree(commandeId, {
      userId: auth.userId,
      userName: auth.userName,
      force: auth.force || input.force,
    });
  }

  const updated = await prisma.commande.update({
    where: { id: commandeId },
    data: {
      note: appendFeedbackNote(commande.note, feedback, commande.numero),
      statut: commandeStatutFromLabel('Livré'),
      avancement: 100,
      // Ne pas écraser une date de livraison déjà posée (re-clôture SAV)
      ...(commande.dateLiv ? {} : { dateLiv: new Date() }),
    },
    select: { id: true, numero: true, statut: true, avancement: true },
  });

  const openReclamation = input.openReclamation !== false;
  const openTalk = input.openTalk !== false;

  let reclamation: { id: string; subject: string } | null = null;
  if (openReclamation) {
    try {
      reclamation = await upsertRetourClientReclamation({
        clientId: commande.clientId,
        commandeId,
        numero: commande.numero,
        feedback,
        priorite: input.priorite ?? 'Normale',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'RECLAMATION_FAILED';
      throw new Error(msg.startsWith('RECLAMATION') ? msg : `SAV : ${msg}`);
    }
  }

  let talkConversation: { id: string; name: string } | null = null;
  if (openTalk) {
    try {
      const talk = await createOrderConversation(commandeId, {
        userId: auth.userId,
        userName: auth.userName,
      });
      talkConversation = { id: talk.id, name: talk.name };

      try {
        const last = await prisma.talkMessage.findFirst({
          where: { conversationId: talk.id, commandeId },
          orderBy: { createdAt: 'desc' },
          select: { body: true },
        });
        const alreadyPosted = Boolean(last?.body?.includes(feedback));
        if (!alreadyPosted) {
          await prisma.talkMessage.create({
            data: {
              conversationId: talk.id,
              senderId: auth.userId,
              senderName: auth.userName || 'ANS ORION',
              senderRole: 'system',
              body: [
                `Commande ${updated.numero} finalisée / livrée.`,
                'Retour client :',
                feedback,
                reclamation
                  ? 'Fiche SAV ouverte pour évaluation des responsables & participants.'
                  : null,
              ]
                .filter(Boolean)
                .join('\n'),
              commandeId,
            },
          });
        }
      } catch {
        // Message système optionnel — le groupe Talk reste utilisable
      }
    } catch {
      // Talk non bloquant : la commande + SAV restent valides
      talkConversation = null;
    }
  }

  await logAudit({
    userId: auth.userId,
    userName: auth.userName,
    action: 'COMMANDE_FINALIZE',
    entity: 'Commande',
    entityId: updated.id,
    entityLabel: updated.numero,
    details: {
      reclamationId: reclamation?.id ?? null,
      talkConversationId: talkConversation?.id ?? null,
      feedbackLength: feedback.length,
      openReclamation,
      openTalk,
    },
  });

  return {
    commande: {
      ...updated,
      statut: commandeStatutLabel(updated.statut),
    },
    reclamation,
    talkConversation,
    redirectTo: buildFinalizeRedirect({
      commandeId,
      reclamationId: reclamation?.id,
      talkId: talkConversation?.id,
    }),
  };
}

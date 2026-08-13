import { prisma } from '@/lib/prisma';
import { DevisStatut } from '@prisma/client';
import { pendingDevisStatuts } from '@/lib/server/data/prisma-statut-bridge';
import { parseDevisNotes } from '@/lib/devis-meta';
import {
  getAcompteRatioFromDevisNotes,
  getRequiredAcompteAmount,
} from '@/lib/devis/acompte-threshold';
import { acceptDevisToCommande } from '@/lib/services/devis-accept-service';
import { syncCommandePaiementTotals } from '@/lib/services/facture-workflow-service';
import { postOrionAssistantMessage } from '@/lib/orion/orion-assistant';
import type { PrismaTx } from '@/lib/services/SequenceService';

export const DEVIS_PAYMENT_NOTE_PREFIX = '__devis:';

export function encodeDevisPaymentNote(devisId: string, userNotes?: string | null): string {
  const base = `${DEVIS_PAYMENT_NOTE_PREFIX}${devisId}`;
  return userNotes?.trim() ? `${base}\n${userNotes.trim()}` : base;
}

export function extractDevisIdFromPaymentNotes(notes?: string | null): string | null {
  if (!notes) return null;
  if (notes.startsWith(DEVIS_PAYMENT_NOTE_PREFIX)) {
    const rest = notes.slice(DEVIS_PAYMENT_NOTE_PREFIX.length);
    const id = rest.split('\n')[0]?.trim();
    return id || null;
  }
  return null;
}

export { getRequiredAcompteAmount, getAcompteRatioFromDevisNotes };

/** Rattache les paiements devis à la commande et recalcule acompte/reste. */
export async function linkDevisPaymentsToCommande(
  devisId: string,
  commandeId: string,
  tx?: PrismaTx,
) {
  const db = tx ?? prisma;
  const prefix = `${DEVIS_PAYMENT_NOTE_PREFIX}${devisId}`;
  await db.paiement.updateMany({
    where: {
      OR: [
        { notes: { startsWith: prefix } },
        { notes: { contains: devisId }, commandeId: null },
      ],
    },
    data: { commandeId },
  });
  return syncCommandePaiementTotals(commandeId, db);
}

/** Après acompte sur devis : conversion auto en commande si seuil atteint. */
export async function tryAutoConvertDevisOnAcompte(params: {
  devisId: string;
  montant: number;
  userId?: string;
  userName?: string;
}) {
  const devis = await prisma.devis.findUnique({
    where: { id: params.devisId },
    select: { id: true, numero: true, statut: true, totalTTC: true, notes: true, clientId: true },
  });
  if (!devis) return { converted: false as const, reason: 'devis_not_found' };

  const existingCmd = await prisma.commande.findFirst({
    where: { devisId: devis.id },
    select: { id: true, numero: true },
  });
  if (existingCmd) {
    await linkDevisPaymentsToCommande(params.devisId, existingCmd.id);
    return { converted: false as const, alreadyConverted: true as const, commande: existingCmd };
  }

  if (devis.statut === DevisStatut.Accepte) {
    return { converted: false as const, reason: 'already_accepted' };
  }
  if (!pendingDevisStatuts().includes(devis.statut)) {
    return { converted: false as const, reason: 'invalid_statut' };
  }

  const prefix = `${DEVIS_PAYMENT_NOTE_PREFIX}${params.devisId}`;
  const paiements = await prisma.paiement.findMany({
    where: {
      type: { not: 'Remboursement' },
      OR: [{ notes: { startsWith: prefix } }, { notes: { contains: params.devisId } }],
    },
    select: { montant: true },
  });
  const totalPaye = paiements.reduce((s, p) => s + p.montant, 0);
  const seuil = getRequiredAcompteAmount(devis);

  if (totalPaye < seuil - 1) {
    await postOrionAssistantMessage({
      type: 'acompte_recu',
      title: 'Acompte reçu',
      body: `${devis.numero} — ${params.montant.toLocaleString('fr-FR')} Ar (total ${totalPaye.toLocaleString('fr-FR')} / ${seuil.toLocaleString('fr-FR')} Ar requis).`,
      link: `/devis?id=${devis.id}`,
      dedupKey: `acompte-partial:${devis.id}:${totalPaye}`,
    });
    return { converted: false as const, reason: 'below_threshold', totalPaye, seuil };
  }

  const result = await acceptDevisToCommande(params.devisId, {
    userId: params.userId,
    userName: params.userName ?? 'ORION (acompte)',
  });

  if (!result.ok) return { converted: false as const, reason: result.code };

  await linkDevisPaymentsToCommande(params.devisId, result.commande.id);

  await postOrionAssistantMessage({
    type: 'acompte_recu',
    title: 'Acompte → commande',
    body: `Acompte validé — ${devis.numero} converti en ${result.commande.numero}.`,
    link: `/commandes/${result.commande.id}`,
    commandeId: result.commande.id,
    dedupKey: `acompte-convert:${devis.id}`,
  });

  return { converted: true as const, commande: result.commande };
}

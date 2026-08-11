import { prisma } from '@/lib/server/db/prisma';
import {
  commandeRemainingAmount,
  paidTotal,
  paiementsForCommandesWhere,
} from '@/lib/server/modules/paiements/paiements.repository';
import { roundMga } from '@/lib/money/mga';

export type CommandePaymentTotals = { acompte: number; reste: number };

/** Ariary = entiers — tout reste > 0 est dû (plus de tolérance 0,01). */
const RESTE_EPSILON = 0;

/** Totaux encaissés par commande (direct + via facture liée). */
export async function batchCommandePaymentTotals(
  commandes: { id: string; total: number }[],
): Promise<Map<string, CommandePaymentTotals>> {
  const result = new Map<string, CommandePaymentTotals>();
  if (commandes.length === 0) return result;

  const ids = commandes.map((c) => c.id);
  const paiements = await prisma.paiement.findMany({
    where: paiementsForCommandesWhere(ids),
    select: {
      commandeId: true,
      montant: true,
      type: true,
      statut: true,
      facture: { select: { commandeId: true } },
    },
  });

  const paidByCommande = new Map<string, { montant: number; type: string; statut?: string }[]>();
  for (const p of paiements) {
    const commandeId = p.commandeId ?? p.facture?.commandeId;
    if (!commandeId) continue;
    const list = paidByCommande.get(commandeId) ?? [];
    list.push({ montant: p.montant, type: p.type, statut: p.statut });
    paidByCommande.set(commandeId, list);
  }

  for (const c of commandes) {
    const related = paidByCommande.get(c.id) ?? [];
    const acompte = paidTotal(related);
    result.set(c.id, {
      acompte,
      reste: commandeRemainingAmount(roundMga(c.total), related),
    });
  }

  return result;
}

export function commandeHasResteAPayer(totals: CommandePaymentTotals | undefined): boolean {
  return (totals?.reste ?? 0) > RESTE_EPSILON;
}

/** IDs commandes avec solde dû réel (encaissements inclus). */
export async function findCommandeIdsWithResteAPayer(
  commandes: { id: string; total: number }[],
): Promise<string[]> {
  const totals = await batchCommandePaymentTotals(commandes);
  return commandes.filter((c) => commandeHasResteAPayer(totals.get(c.id))).map((c) => c.id);
}

export function applyPaymentTotalsToCommande<T extends { id: string; total: number; acompte?: number; reste?: number }>(
  row: T,
  totals: Map<string, CommandePaymentTotals>,
): T {
  const t = totals.get(row.id);
  if (!t) return row;
  return { ...row, acompte: t.acompte, reste: t.reste };
}

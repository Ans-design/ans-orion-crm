import { prisma } from '@/lib/prisma';
import { computePaidTotal } from '@/lib/finance/payment-totals';
import {
  batchCommandePaymentTotals,
  commandeHasResteAPayer,
} from '@/lib/server/modules/commandes/commandes-payment-totals';
import { cancelledCommandeStatuts } from '@/lib/server/data/prisma-statut-bridge';

export { computePaidTotal };

/** Reste dû sur une facture (ledger paiements). */
export function factureResteDue(
  totalTTC: number,
  paiements: { montant: number; type?: string | null }[],
): number {
  return Math.max(0, totalTTC - computePaidTotal(paiements));
}

/** Commandes candidates avec solde (filtre DB + vérif ledger). */
async function loadCommandesAvecResteCandidates() {
  return prisma.commande.findMany({
    where: {
      statut: { notIn: cancelledCommandeStatuts() },
      reste: { gt: 0.01 },
    },
    select: { id: true, total: true, clientId: true },
  });
}

/** Total créances clients — somme des restes commande calculés depuis le ledger. */
export async function getLiveCreancesTotal(): Promise<number> {
  const commandes = await loadCommandesAvecResteCandidates();
  if (commandes.length === 0) return 0;

  const totals = await batchCommandePaymentTotals(commandes);
  return commandes.reduce((sum, c) => {
    const t = totals.get(c.id);
    return commandeHasResteAPayer(t) ? sum + (t!.reste) : sum;
  }, 0);
}

export type ImpayeParClientRow = { name: string; value: number };

/** Top clients par reste dû (ledger commandes). */
export async function getLiveImpayesParClient(limit = 8): Promise<ImpayeParClientRow[]> {
  const commandes = await loadCommandesAvecResteCandidates();
  if (commandes.length === 0) return [];

  const totals = await batchCommandePaymentTotals(commandes);
  const byClient: Record<string, number> = {};

  for (const c of commandes) {
    if (!c.clientId) continue;
    const t = totals.get(c.id);
    if (!commandeHasResteAPayer(t)) continue;
    byClient[c.clientId] = (byClient[c.clientId] ?? 0) + t!.reste;
  }

  const clientIds = Object.keys(byClient);
  if (clientIds.length === 0) return [];

  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true },
  });
  const nameMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  return Object.entries(byClient)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([clientId, value]) => ({
      name: nameMap[clientId] || 'Client',
      value,
    }));
}

/** Encaissements nets sur une période (remboursements soustraits). */
export async function sumEncaissementsInRange(where: { datePaiement?: { gte?: Date; lte?: Date } }) {
  const rows = await prisma.paiement.findMany({
    where,
    select: { montant: true, type: true },
  });
  return computePaidTotal(rows);
}

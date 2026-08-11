import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { ClientStatut } from '@prisma/client';
import { fideleClientStatuts } from '@/lib/server/data/prisma-statut-bridge';

const FIDELE_MIN_CMDS = 5;
const FIDELE_MIN_CA = 5_000_000;

type Tx = Prisma.TransactionClient;

/** Passe le client en Premium si seuils CA / commandes atteints (sans rétrogradation). */
export async function syncClientFideleStatut(clientId: string, tx?: Tx) {
  const db = tx ?? prisma;
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { statut: true, cmds: true, archived: true },
  });
  if (!client || client.archived) return;
  if (fideleClientStatuts().includes(client.statut)) return;

  const cmds = client.cmds ?? 0;
  const caAgg = await db.paiement.aggregate({
    where: { clientId, type: { not: 'Remboursement' } },
    _sum: { montant: true },
  });
  const ca = caAgg._sum.montant ?? 0;

  if (cmds >= FIDELE_MIN_CMDS || ca >= FIDELE_MIN_CA) {
    await db.client.update({
      where: { id: clientId },
      data: { statut: ClientStatut.Premium },
    });
  }
}

export { FIDELE_MIN_CMDS, FIDELE_MIN_CA };

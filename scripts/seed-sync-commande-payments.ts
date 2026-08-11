import type { PrismaClient } from '@prisma/client';
import { syncCommandePaymentSnapshot } from '@/lib/server/modules/snapshots/snapshot.service';

/** Recalcule acompte/reste + paymentSnapshot pour toutes les commandes seedées. */
export async function syncAllCommandePaymentSnapshots(prisma: PrismaClient) {
  const commandes = await prisma.commande.findMany({ select: { id: true } });
  if (commandes.length === 0) {
    console.log('syncCommandePayments — aucune commande, skip');
    return;
  }

  let synced = 0;
  for (const { id } of commandes) {
    await syncCommandePaymentSnapshot(id);
    synced++;
  }
  console.log(`syncCommandePayments — ${synced} commande(s) resynchronisée(s) depuis paiements`);
}

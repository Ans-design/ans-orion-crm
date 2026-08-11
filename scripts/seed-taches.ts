import type { PrismaClient } from '@prisma/client';

/**
 * Seed tâches : en E2E / multi-DB, le singleton `@/lib/prisma` peut pointer
 * ailleurs que le client de seed. On crée des tâches via le client passé uniquement.
 */
export async function seedTaches(prisma: PrismaClient) {
  try {
    const count = await prisma.metierTask.count().catch(() => -1);
    if (count < 0) {
      console.warn('[seedTaches] table MetierTask absente — skip');
      return;
    }
    if (count > 0) {
      console.log(`${count} tâches déjà présentes — skip backfill cross-client`);
      return;
    }

    const commandes = await prisma.commande.findMany({
      where: { statut: { notIn: ['Livrée', 'Annulée', 'Terminée'] } },
      select: { id: true, numero: true },
      take: 50,
    }).catch(() => [] as Array<{ id: string; numero: string }>);

    if (!commandes.length) {
      console.log('[seedTaches] aucune commande — skip');
      return;
    }

    let created = 0;
    for (const c of commandes) {
      const existing = await prisma.metierTask.count({ where: { commandeId: c.id } });
      if (existing > 0) continue;
      await prisma.metierTask.create({
        data: {
          commandeId: c.id,
          title: `Production ${c.numero}`,
          type: 'production',
          status: 'À faire',
          priorite: 'Normal',
        },
      }).catch(() => null);
      created += 1;
    }
    console.log(`${created} tâches seedées (client seed local)`);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    console.warn('[seedTaches] ignoré (non bloquant):', code ?? (error instanceof Error ? error.message : error));
  }
}

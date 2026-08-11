import { prisma } from '@/lib/prisma';

/** Crée une ligne par commande legacy sans lignes */
export async function backfillCommandeLignes(prismaClient = prisma) {
  const commandes = await prismaClient.commande.findMany({
    where: { lignes: { none: {} } },
    select: { id: true, article: true, qty: true, total: true, configSnapshot: true },
  });

  for (const cmd of commandes) {
    await prismaClient.commandeLigne.create({
      data: {
        commandeId: cmd.id,
        articleLabel: cmd.article,
        configSnapshot: cmd.configSnapshot ?? undefined,
        quantity: cmd.qty,
        totalLigne: cmd.total,
        sortOrder: 0,
      },
    });
  }

  if (commandes.length > 0) {
    console.log(`${commandes.length} commandes migrées en multi-lignes`);
  }
}

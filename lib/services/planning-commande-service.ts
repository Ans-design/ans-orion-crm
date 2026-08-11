import { prisma } from '@/lib/prisma';

/** Insère un créneau Gantt automatiquement après conversion commande (évite doublon). */
export async function schedulePlanningSlotForCommande(commandeId: string) {
  const existing = await prisma.productionSlot.findFirst({ where: { commandeId } });
  if (existing) return { slot: existing, created: false as const };

  const cmd = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { id: true, numero: true, article: true, dateLiv: true, priorite: true },
  });
  if (!cmd) return null;

  const startAt = new Date();
  startAt.setMinutes(0, 0, 0);
  startAt.setHours(startAt.getHours() + 1);

  if (cmd.dateLiv) {
    const target = new Date(cmd.dateLiv);
    target.setDate(target.getDate() - 2);
    target.setHours(8, 0, 0, 0);
    if (target.getTime() > Date.now()) {
      startAt.setTime(target.getTime());
    }
  }

  const endAt = new Date(startAt);
  endAt.setHours(endAt.getHours() + 4);

  const slot = await prisma.productionSlot.create({
    data: {
      title: `Production ${cmd.numero}`,
      commandeId: cmd.id,
      startAt,
      endAt,
      statut: 'Planifié',
      notes: `Planification auto — ${cmd.article}`,
    },
  });

  return { slot, created: true as const };
}

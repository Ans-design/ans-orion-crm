/**
 * Crée un slot planning pour chaque commande sans ProductionSlot.
 * Usage: npm run backfill:planning-slots
 */
async function main() {
  process.env.APP_ENV = process.env.APP_ENV ?? 'local';
  process.env.LOCAL_DEV = process.env.LOCAL_DEV ?? 'true';
  if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
    process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
  }
  await import('@/lib/init-server-env');

  const { prisma } = await import('@/lib/prisma');
  const { schedulePlanningSlotForCommande } = await import('@/lib/services/planning-commande-service');

  const all = await prisma.commande.findMany({
    select: { id: true, numero: true, statut: true },
    take: 500,
  });
  const withSlot = new Set(
    (await prisma.productionSlot.findMany({
      where: { commandeId: { not: null } },
      select: { commandeId: true },
    }))
      .map((s) => s.commandeId)
      .filter((id): id is string => Boolean(id)),
  );

  const missing = all.filter((c) => {
    const st = String(c.statut);
    if (/livr|annul/i.test(st)) return false;
    return !withSlot.has(c.id);
  });

  let created = 0;
  for (const c of missing) {
    const r = await schedulePlanningSlotForCommande(c.id);
    if (r?.created) created++;
  }

  console.log(`✅ backfill:planning-slots — ${created} créés / ${missing.length} commandes sans slot`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Normalise les statuts commande legacy vers l'enum Prisma canonique.
 *
 * Usage:
 *   npm run backfill:commande-statuts
 *   npm run backfill:commande-statuts -- --dry-run
 */
import { prisma } from '@/lib/prisma';
import { normalizeCommandeStatut } from '@/lib/data/status-registry';
import {
  commandeStatutFromLabel,
  commandeStatutLabel,
} from '@/lib/server/data/prisma-statut-bridge';

const dryRun = process.argv.includes('--dry-run');

export async function backfillCommandeStatuts(prismaClient = prisma) {
  const rows = await prismaClient.commande.findMany({
    select: { id: true, numero: true, statut: true },
    orderBy: { createdAt: 'asc' },
  });

  let updated = 0;
  for (const row of rows) {
    const label = commandeStatutLabel(row.statut);
    const normalized = normalizeCommandeStatut(label);
    const enumVal = commandeStatutFromLabel(normalized);
    if (enumVal === row.statut) continue;

    if (dryRun) {
      console.log(`[dry-run] ${row.numero}: ${row.statut} → ${enumVal} (${normalized})`);
    } else {
      await prismaClient.commande.update({
        where: { id: row.id },
        data: { statut: enumVal },
      });
    }
    updated += 1;
  }

  console.log(
    dryRun
      ? `Dry-run : ${updated} commande(s) à normaliser`
      : `✅ ${updated} commande(s) normalisée(s)`,
  );

  return { updated, total: rows.length };
}

if (require.main === module) {
  backfillCommandeStatuts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

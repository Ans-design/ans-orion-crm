/**
 * Normalise les statuts client legacy vers l'enum Prisma ClientStatut.
 *
 * Usage:
 *   npm run backfill:client-statuts
 *   npm run backfill:client-statuts -- --dry-run
 */
import { prisma } from '@/lib/prisma';
import {
  clientStatutFromLabel,
  clientStatutLabel,
} from '@/lib/server/data/prisma-statut-bridge';

const dryRun = process.argv.includes('--dry-run');

export async function backfillClientStatuts(prismaClient = prisma) {
  const rows = await prismaClient.client.findMany({
    select: { id: true, code: true, statut: true },
    orderBy: { createdAt: 'asc' },
  });

  let updated = 0;
  for (const row of rows) {
    const label = clientStatutLabel(row.statut);
    const enumVal = clientStatutFromLabel(label);
    if (enumVal === row.statut) continue;

    if (dryRun) {
      console.log(`[dry-run] ${row.code}: ${row.statut} → ${enumVal} (${label})`);
    } else {
      await prismaClient.client.update({
        where: { id: row.id },
        data: { statut: enumVal },
      });
    }
    updated += 1;
  }

  console.log(
    dryRun
      ? `Dry-run : ${updated} client(s) à normaliser`
      : `✅ ${updated} client(s) normalisé(s)`,
  );

  return { updated, total: rows.length };
}

if (require.main === module) {
  backfillClientStatuts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

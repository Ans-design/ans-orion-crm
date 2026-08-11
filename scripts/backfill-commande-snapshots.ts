/**
 * Backfill snapshots commande v1 (client, articles, paiement, logistique figés).
 *
 * Usage:
 *   npm run backfill:commande-snapshots
 *   npm run backfill:commande-snapshots -- --dry-run
 */
import { prisma } from '@/lib/prisma';
import {
  buildOrderSnapshotFromCommande,
  needsOrderSnapshotBackfill,
} from '@/lib/commande/order-snapshot';

const dryRun = process.argv.includes('--dry-run');

export async function backfillCommandeSnapshots(prismaClient = prisma) {
  const commandes = await prismaClient.commande.findMany({
    include: {
      client: true,
      devis: { include: { lignes: { orderBy: { sortOrder: 'asc' } } } },
      lignes: { orderBy: { sortOrder: 'asc' } },
      paiements: { select: { montant: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  let updated = 0;
  let skipped = 0;

  for (const cmd of commandes) {
    if (!needsOrderSnapshotBackfill(cmd.configSnapshot)) {
      skipped += 1;
      continue;
    }

    const lignes = cmd.lignes.length
      ? cmd.lignes
      : cmd.devis?.lignes ?? [];

    const paiementsTotal = cmd.paiements.reduce((s, p) => s + p.montant, 0);
    const acompte = cmd.acompte > 0 ? cmd.acompte : paiementsTotal;
    const reste = Math.max(0, cmd.total - acompte);

    const snapshot = buildOrderSnapshotFromCommande({
      commande: {
        id: cmd.id,
        numero: cmd.numero,
        total: cmd.total,
        acompte,
        reste,
        dateLiv: cmd.dateLiv,
        priorite: cmd.priorite,
        createdAt: cmd.createdAt,
        clientId: cmd.clientId,
      },
      client: cmd.client,
      lignes: lignes.map((l) => ({
        articleId: l.articleId,
        articleLabel: l.articleLabel,
        configSnapshot: l.configSnapshot,
        quantity: l.quantity,
        totalLigne: l.totalLigne,
      })),
      devis: cmd.devis
        ? {
            id: cmd.devis.id,
            numero: cmd.devis.numero,
            sousTotal: cmd.devis.sousTotal,
            remise: cmd.devis.remise,
            totalHT: cmd.devis.totalHT,
            totalTTC: cmd.devis.totalTTC,
            validUntil: cmd.devis.validUntil,
            clientId: cmd.devis.clientId,
            notes: cmd.devis.notes,
            lignes: cmd.devis.lignes.map((l) => ({
              articleId: l.articleId,
              articleLabel: l.articleLabel,
              configSnapshot: l.configSnapshot,
              quantity: l.quantity,
              totalLigne: l.totalLigne,
              prixUnitaireForce: l.prixUnitaireForce,
              prixUnitaireAuto: l.prixUnitaireAuto,
            })),
          }
        : null,
    });

    if (dryRun) {
      console.log(`[dry-run] ${cmd.numero} → snapshot v1 (${lignes.length} ligne(s))`);
    } else {
      await prismaClient.commande.update({
        where: { id: cmd.id },
        data: {
          configSnapshot: snapshot as object,
          ...(cmd.acompte <= 0 && acompte > 0 ? { acompte, reste } : {}),
        },
      });
    }
    updated += 1;
  }

  console.log(
    dryRun
      ? `Dry-run : ${updated} commande(s) à migrer, ${skipped} déjà OK`
      : `✅ ${updated} snapshot(s) créé(s), ${skipped} déjà à jour`,
  );
}

async function main() {
  console.log(`═══ Backfill snapshots commande ${dryRun ? '(dry-run)' : ''} ═══\n`);
  await backfillCommandeSnapshots();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

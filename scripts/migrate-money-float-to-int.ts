/**
 * FIN-01 phase 2 — arrondi pré-migration Float→Int puis prisma db push.
 * Usage: npx tsx scripts/migrate-money-float-to-int.ts
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { copyFileSync, existsSync } from 'fs';

loadEnv({ path: resolve(process.cwd(), '.env.local') });
loadEnv({ path: resolve(process.cwd(), '.env') });
{
  const absDb = resolve(process.cwd(), 'prisma', 'dev.db');
  process.env.DATABASE_URL = `file:${absDb.replace(/\\/g, '/')}`;
}

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const round = (n: number) => (Number.isFinite(n) ? Math.round(n) : 0);

  console.log('═══ Pré-migration arrondi MGA ═══');

  const cmds = await prisma.commande.findMany();
  for (const c of cmds) {
    const total = round((c as { totalAriary?: number | null }).totalAriary ?? c.total);
    const acompte = round((c as { acompteAriary?: number | null }).acompteAriary ?? c.acompte);
    const reste = round((c as { resteAriary?: number | null }).resteAriary ?? c.reste);
    await prisma.$executeRawUnsafe(
      `UPDATE Commande SET total = ?, acompte = ?, reste = ? WHERE id = ?`,
      total,
      acompte,
      reste,
      c.id,
    );
  }
  console.log(`Commande: ${cmds.length} arrondies`);

  const pays = await prisma.paiement.findMany();
  for (const p of pays) {
    const montant = round((p as { montantAriary?: number | null }).montantAriary ?? p.montant);
    await prisma.$executeRawUnsafe(`UPDATE Paiement SET montant = ? WHERE id = ?`, montant, p.id);
  }
  console.log(`Paiement: ${pays.length} arrondis`);

  const facts = await prisma.facture.findMany();
  for (const f of facts) {
    const row = f as {
      sousTotalAriary?: number | null;
      remiseAriary?: number | null;
      totalHTAriary?: number | null;
      totalTTCAriary?: number | null;
    };
    await prisma.$executeRawUnsafe(
      `UPDATE Facture SET sousTotal = ?, remise = ?, totalHT = ?, totalTTC = ? WHERE id = ?`,
      round(row.sousTotalAriary ?? f.sousTotal),
      round(row.remiseAriary ?? f.remise),
      round(row.totalHTAriary ?? f.totalHT),
      round(row.totalTTCAriary ?? f.totalTTC),
      f.id,
    );
  }
  console.log(`Facture: ${facts.length} arrondies`);

  const devis = await prisma.devis.findMany();
  for (const d of devis) {
    await prisma.$executeRawUnsafe(
      `UPDATE Devis SET sousTotal = ?, remise = ?, totalHT = ?, totalTTC = ? WHERE id = ?`,
      round(d.sousTotal),
      round(d.remise),
      round(d.totalHT),
      round(d.totalTTC),
      d.id,
    );
  }
  console.log(`Devis: ${devis.length} arrondis`);

  const lignes = await prisma.devisLigne.findMany();
  for (const l of lignes) {
    await prisma.$executeRawUnsafe(
      `UPDATE DevisLigne SET prixUnitaireAuto = ?, prixUnitaireForce = ?, totalForce = ?, totalLigne = ? WHERE id = ?`,
      round(l.prixUnitaireAuto),
      l.prixUnitaireForce == null ? null : round(l.prixUnitaireForce),
      l.totalForce == null ? null : round(l.totalForce),
      round(l.totalLigne),
      l.id,
    );
  }
  console.log(`DevisLigne: ${lignes.length} arrondies`);

  const cmdLignes = await prisma.commandeLigne.findMany();
  for (const l of cmdLignes) {
    await prisma.$executeRawUnsafe(
      `UPDATE CommandeLigne SET totalLigne = ? WHERE id = ?`,
      round(l.totalLigne),
      l.id,
    );
  }
  console.log(`CommandeLigne: ${cmdLignes.length} arrondies`);

  await prisma.$disconnect();
  console.log('✅ Arrondi terminé — lancer: npx prisma db push --accept-data-loss');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

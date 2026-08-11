/**
 * Purge données opérationnelles → base « vierge » prête à la 1ʳᵉ utilisation.
 *
 * SUPPRIME : clients, tâches, devis, commandes, factures, paiements, livraisons,
 * production, dépenses, messages Talk, notifications, mouvements stock, etc.
 *
 * CONSERVE : users (login), employés, permissions, catalogue/prix/configurateurs,
 * machines/matériels (parc), fournisseurs (référentiel optionnel), règles métier.
 *
 * Sécurité :
 *   CONFIRM_WIPE_OPERATIONAL=YES  obligatoire
 *   SQLite local (file:) par défaut
 *   Postgres uniquement si ALLOW_WIPE_POSTGRES=YES
 *
 * Usage :
 *   CONFIRM_WIPE_OPERATIONAL=YES npx tsx --require dotenv/config scripts/wipe-operational-data.ts
 */
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

// Charger .env.local puis .env (Next local)
const root = process.cwd();
if (existsSync(join(root, '.env.local'))) loadEnv({ path: join(root, '.env.local'), override: false });
if (existsSync(join(root, '.env'))) loadEnv({ path: join(root, '.env'), override: false });

function resolveDbUrl(): string {
  const raw = (process.env.DATABASE_URL || '').trim();
  if (raw.startsWith('postgres') && ALLOW_PG) return raw;
  // Toujours absolu pour SQLite (évite confusion cwd vs dossier prisma/)
  const abs = join(root, 'prisma', 'dev.db').replace(/\\/g, '/');
  if (raw.startsWith('file:') && (raw.includes('dev.db') || raw.includes('prisma'))) {
    return `file:${abs}`;
  }
  const sqlite = (process.env.DATABASE_URL_SQLITE || '').trim();
  if (sqlite.startsWith('file:')) return `file:${abs}`;
  return `file:${abs}`;
}

const CONFIRM = process.env.CONFIRM_WIPE_OPERATIONAL === 'YES';
const ALLOW_PG = process.env.ALLOW_WIPE_POSTGRES === 'YES';

type CountRow = { key: string; n: number };

async function countOps(prisma: PrismaClient): Promise<CountRow[]> {
  const entries: Array<[string, () => Promise<number>]> = [
    ['clients', () => prisma.client.count()],
    ['reclamations', () => prisma.clientReclamation.count()],
    ['metierTasks', () => prisma.metierTask.count()],
    ['devis', () => prisma.devis.count()],
    ['commandes', () => prisma.commande.count()],
    ['factures', () => prisma.facture.count()],
    ['paiements', () => prisma.paiement.count()],
    ['livraisons', () => prisma.livraison.count()],
    ['financeCharges', () => prisma.financeCharge.count()],
    ['productions', () => prisma.production.count()],
    ['dossiersGpao', () => prisma.productionDossier.count()],
    ['talkMessages', () => prisma.talkMessage.count()],
    ['stockMovements', () => prisma.stockMovement.count()],
    ['cashSessions', () => prisma.cashSession.count()],
  ];
  const out: CountRow[] = [];
  for (const [key, fn] of entries) {
    try {
      out.push({ key, n: await fn() });
    } catch {
      out.push({ key, n: -1 });
    }
  }
  return out;
}

function printCounts(label: string, rows: CountRow[]) {
  console.log(`\n── ${label} ──`);
  for (const r of rows) {
    console.log(`  ${r.key.padEnd(18)} ${r.n < 0 ? 'n/a' : r.n}`);
  }
}

async function safeDelete(
  label: string,
  fn: () => Promise<{ count: number }>,
): Promise<number> {
  try {
    const res = await fn();
    if (res.count > 0) console.log(`  ✓ ${label}: ${res.count}`);
    return res.count;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`  ⚠ ${label}: skip (${msg.slice(0, 120)})`);
    return 0;
  }
}

async function main() {
  const url = resolveDbUrl();
  process.env.DATABASE_URL = url;
  if (!CONFIRM) {
    console.error('❌ Refusé : définissez CONFIRM_WIPE_OPERATIONAL=YES');
    process.exit(1);
  }
  if (url.startsWith('postgres') && !ALLOW_PG) {
    console.error('❌ Refusé sur Postgres sans ALLOW_WIPE_POSTGRES=YES');
    process.exit(1);
  }
  if (!url.startsWith('file:') && !url.startsWith('postgres')) {
    console.error('❌ DATABASE_URL invalide');
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  console.log('═══ ANS ORION — wipe opérationnel (projet vierge) ═══');
  console.log(`DB: ${url.startsWith('file:') ? 'SQLite local' : 'Postgres'}`);
  if (url.startsWith('file:')) console.log(`   ${url}`);

  const before = await countOps(prisma);
  printCounts('AVANT', before);

  console.log('\n── Purge (ordre FK) ──');

  // Talk / messagerie
  await safeDelete('talkAttachmentDownload', () => prisma.talkAttachmentDownload.deleteMany());
  await safeDelete('talkAttachmentVersion', () => prisma.talkAttachmentVersion.deleteMany());
  await safeDelete('talkAttachment', () => prisma.talkAttachment.deleteMany());
  await safeDelete('talkMessageReaction', () => prisma.talkMessageReaction.deleteMany());
  await safeDelete('talkMessageRead', () => prisma.talkMessageRead.deleteMany());
  await safeDelete('talkMessageTask', () => prisma.talkMessageTask.deleteMany());
  await safeDelete('talkMessage', () => prisma.talkMessage.deleteMany());
  await safeDelete('talkConversationMember', () => prisma.talkConversationMember.deleteMany());
  await safeDelete('talkConversation', () => prisma.talkConversation.deleteMany());
  await safeDelete('teamMessageReply', () => prisma.teamMessageReply.deleteMany());
  await safeDelete('teamMessage', () => prisma.teamMessage.deleteMany());
  await safeDelete('teamSuggestion', () => prisma.teamSuggestion.deleteMany());

  // Tâches
  await safeDelete('metierTask', () => prisma.metierTask.deleteMany());

  // Notifications / audit / sync
  await safeDelete('notificationReceipt', () => prisma.notificationReceipt.deleteMany());
  await safeDelete('notification', () => prisma.notification.deleteMany());
  await safeDelete('clientNotificationLog', () => prisma.clientNotificationLog.deleteMany());
  await safeDelete('auditLog', () => prisma.auditLog.deleteMany());
  await safeDelete('outboxEvent', () => prisma.outboxEvent.deleteMany());
  await safeDelete('syncRunStep', () => prisma.syncRunStep.deleteMany());
  await safeDelete('syncRun', () => prisma.syncRun.deleteMany());
  await safeDelete('importAnomaly', () => prisma.importAnomaly.deleteMany());
  await safeDelete('accessRequest', () => prisma.accessRequest.deleteMany());

  // CM opérationnel
  await safeDelete('cmCampaignPost', () => prisma.cmCampaignPost.deleteMany());
  await safeDelete('cmRelance', () => prisma.cmRelance.deleteMany());
  await safeDelete('cmCampaign', () => prisma.cmCampaign.deleteMany());
  // templates CM = config → on garde cmMessageTemplate

  // Studio opérationnel
  await safeDelete('studioPrepressCheck', () => prisma.studioPrepressCheck.deleteMany());
  await safeDelete('studioCreativeVersion', () => prisma.studioCreativeVersion.deleteMany());
  await safeDelete('studioBrief', () => prisma.studioBrief.deleteMany());
  await safeDelete('proofVersion', () => prisma.proofVersion.deleteMany());
  await safeDelete('proof', () => prisma.proof.deleteMany());
  await safeDelete('fileAsset', () => prisma.fileAsset.deleteMany());

  // Qualité / maintenance tickets / déchets
  await safeDelete('qualiteControle', () => prisma.qualiteControle.deleteMany());
  await safeDelete('maintenanceTicket', () => prisma.maintenanceTicket.deleteMany());
  await safeDelete('materialWaste', () => prisma.materialWaste.deleteMany());
  await safeDelete('productionIncident', () => prisma.productionIncident.deleteMany());

  // Production / planning
  await safeDelete('productionDossierEtape', () => prisma.productionDossierEtape.deleteMany());
  await safeDelete('productionDossier', () => prisma.productionDossier.deleteMany());
  await safeDelete('productionEtape', () => prisma.productionEtape.deleteMany());
  await safeDelete('production', () => prisma.production.deleteMany());
  await safeDelete('productionSlot', () => prisma.productionSlot.deleteMany());

  // Finance transactionnelle
  await safeDelete('paiement', () => prisma.paiement.deleteMany());
  await safeDelete('facture', () => prisma.facture.deleteMany());
  await safeDelete('livraison', () => prisma.livraison.deleteMany());
  await safeDelete('cashSession', () => prisma.cashSession.deleteMany());
  await safeDelete('financeCharge', () => prisma.financeCharge.deleteMany());
  await safeDelete('stockDirectSale', () => prisma.stockDirectSale.deleteMany());
  await safeDelete('fiscalObligation', () => prisma.fiscalObligation.deleteMany());

  // Achats opérationnels (fournisseurs référentiel conservé)
  await safeDelete('purchaseOrderLine', () => prisma.purchaseOrderLine.deleteMany());
  await safeDelete('purchaseOrder', () => prisma.purchaseOrder.deleteMany());

  // Stock mouvements (catalogue StockItem conservé, quantités remises à 0)
  await safeDelete('stockReservation', () => prisma.stockReservation.deleteMany());
  await safeDelete('stockMovement', () => prisma.stockMovement.deleteMany());
  try {
    const reset = await prisma.stockItem.updateMany({
      data: { quantity: 0, reservedQty: 0 },
    });
    if (reset.count > 0) console.log(`  ✓ stockItem qty/reserved→0: ${reset.count}`);
  } catch {
    console.warn('  ⚠ reset stock quantities skip');
  }

  // Devis / commandes
  await safeDelete('clientReclamation', () => prisma.clientReclamation.deleteMany());
  await safeDelete('commandeBlocage', () => prisma.commandeBlocage.deleteMany());
  await safeDelete('commandeLigne', () => prisma.commandeLigne.deleteMany());
  await safeDelete('devisLigne', () => prisma.devisLigne.deleteMany());
  await safeDelete('commande', () => prisma.commande.deleteMany());
  await safeDelete('devis', () => prisma.devis.deleteMany());

  // Clients (dernier maillon CRM)
  await safeDelete('client', () => prisma.client.deleteMany());

  // RH opérationnel (employés / comptes conservés)
  await safeDelete('employeePresence', () => prisma.employeePresence.deleteMany());
  await safeDelete('employeeAbsence', () => prisma.employeeAbsence.deleteMany());
  await safeDelete('employeeEvaluation', () => prisma.employeeEvaluation.deleteMany());
  await safeDelete('employeeAdvance', () => prisma.employeeAdvance.deleteMany());
  await safeDelete('payslip', () => prisma.payslip.deleteMany());
  await safeDelete('recruitCandidate', () => prisma.recruitCandidate.deleteMany());
  await safeDelete('rhAnnouncement', () => prisma.rhAnnouncement.deleteMany());

  // Compteurs de numérotation → repartir à zéro
  await safeDelete('sequenceCounter', () => prisma.sequenceCounter.deleteMany());

  // Ticker messages opérationnels
  await safeDelete('tickerMessage', () => prisma.tickerMessage.deleteMany());

  const after = await countOps(prisma);
  printCounts('APRÈS', after);

  const users = await prisma.user.count();
  const employees = await prisma.employee.count();
  const profiles = await prisma.articlePricingProfile.count().catch(() => -1);
  console.log('\n── Conservé ──');
  console.log(`  users=${users}  employees=${employees}  articlePricingProfiles=${profiles}`);
  console.log('\n✅ Base opérationnelle vierge. Vous pouvez créer de nouveaux clients, commandes, dépenses.');
  console.log('   Login inchangé. Catalogue / configurateurs prix conservés.\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});

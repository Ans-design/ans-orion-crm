import { PrismaClient } from '@prisma/client';
import fs from 'fs';

function parse(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    vars[line.slice(0, i)] = v;
  }
  return vars;
}

if (process.env.CONFIRM_WIPE_OPERATIONAL !== 'YES') {
  console.error('CONFIRM_WIPE_OPERATIONAL=YES required');
  process.exit(1);
}

const merged = {
  ...parse('.env.ans-orion-crm.neon'),
  ...parse('.env.vercel.postgres.local'),
  ...parse('.env.vercel.parity.secrets'),
};
let pg =
  process.env.DATABASE_URL?.startsWith('postgres')
    ? process.env.DATABASE_URL
    : merged.DATABASE_URL_UNPOOLED || merged.POSTGRES_URL_NON_POOLING || merged.DATABASE_URL;
const u = new URL(pg);
u.searchParams.set('connection_limit', '5');
pg = u.toString();

const prisma = new PrismaClient({ datasources: { db: { url: pg } } });

async function del(label, fn) {
  try {
    const r = await fn();
    console.log(`  ✓ ${label}`, r?.count ?? '');
  } catch (e) {
    console.warn(`  ⚠ ${label}:`, String(e.message || e).slice(0, 100));
  }
}

console.log('Wipe Neon ops…', pg.replace(/:[^:@]+@/, ':***@').slice(0, 70));

await del('talk*', async () => {
  await prisma.talkAttachmentDownload.deleteMany().catch(() => {});
  await prisma.talkAttachmentVersion.deleteMany().catch(() => {});
  await prisma.talkAttachment.deleteMany().catch(() => {});
  await prisma.talkMessageReaction.deleteMany().catch(() => {});
  await prisma.talkMessageRead.deleteMany().catch(() => {});
  await prisma.talkMessageTask.deleteMany().catch(() => {});
  await prisma.talkMessage.deleteMany().catch(() => {});
  await prisma.talkConversationMember.deleteMany().catch(() => {});
  return prisma.talkConversation.deleteMany().catch(() => ({ count: 0 }));
});

await del('team*', async () => {
  await prisma.teamMessageReply.deleteMany().catch(() => {});
  await prisma.teamMessage.deleteMany().catch(() => {});
  return prisma.teamSuggestion.deleteMany().catch(() => ({ count: 0 }));
});

await del('metierTask', () => prisma.metierTask.deleteMany());
await del('notifications', async () => {
  await prisma.notificationReceipt.deleteMany().catch(() => {});
  await prisma.clientNotificationLog.deleteMany().catch(() => {});
  return prisma.notification.deleteMany().catch(() => ({ count: 0 }));
});
await del('audit/sync', async () => {
  await prisma.auditLog.deleteMany().catch(() => {});
  await prisma.outboxEvent.deleteMany().catch(() => {});
  await prisma.syncRunStep.deleteMany().catch(() => {});
  await prisma.syncRun.deleteMany().catch(() => {});
  return prisma.importAnomaly.deleteMany().catch(() => ({ count: 0 }));
});
await del('studio/cm', async () => {
  await prisma.cmCampaignPost.deleteMany().catch(() => {});
  await prisma.cmRelance.deleteMany().catch(() => {});
  await prisma.cmCampaign.deleteMany().catch(() => {});
  await prisma.studioPrepressCheck.deleteMany().catch(() => {});
  await prisma.studioCreativeVersion.deleteMany().catch(() => {});
  await prisma.studioBrief.deleteMany().catch(() => {});
  await prisma.proofVersion.deleteMany().catch(() => {});
  await prisma.proof.deleteMany().catch(() => {});
  return prisma.fileAsset.deleteMany().catch(() => ({ count: 0 }));
});
await del('production', async () => {
  await prisma.qualiteControle.deleteMany().catch(() => {});
  await prisma.maintenanceTicket.deleteMany().catch(() => {});
  await prisma.materialWaste.deleteMany().catch(() => {});
  await prisma.productionIncident.deleteMany().catch(() => {});
  await prisma.productionDossierEtape.deleteMany().catch(() => {});
  await prisma.productionDossier.deleteMany().catch(() => {});
  await prisma.productionEtape.deleteMany().catch(() => {});
  await prisma.production.deleteMany().catch(() => {});
  return prisma.productionSlot.deleteMany().catch(() => ({ count: 0 }));
});
await del('finance', async () => {
  await prisma.paiement.deleteMany().catch(() => {});
  await prisma.facture.deleteMany().catch(() => {});
  await prisma.livraison.deleteMany().catch(() => {});
  await prisma.cashSession.deleteMany().catch(() => {});
  await prisma.financeCharge.deleteMany().catch(() => {});
  await prisma.stockDirectSale.deleteMany().catch(() => {});
  await prisma.fiscalObligation.deleteMany().catch(() => {});
  await prisma.purchaseOrderLine.deleteMany().catch(() => {});
  await prisma.purchaseOrder.deleteMany().catch(() => {});
  await prisma.stockReservation.deleteMany().catch(() => {});
  return prisma.stockMovement.deleteMany().catch(() => ({ count: 0 }));
});
await del('commandes/clients', async () => {
  await prisma.clientReclamation.deleteMany().catch(() => {});
  await prisma.commandeBlocage.deleteMany().catch(() => {});
  await prisma.commandeLigne.deleteMany().catch(() => {});
  await prisma.devisLigne.deleteMany().catch(() => {});
  await prisma.commande.deleteMany().catch(() => {});
  await prisma.devis.deleteMany().catch(() => {});
  return prisma.client.deleteMany().catch(() => ({ count: 0 }));
});
await del('rh ops', async () => {
  await prisma.employeePresence.deleteMany().catch(() => {});
  await prisma.employeeAbsence.deleteMany().catch(() => {});
  await prisma.employeeEvaluation.deleteMany().catch(() => {});
  await prisma.employeeAdvance.deleteMany().catch(() => {});
  await prisma.payslip.deleteMany().catch(() => {});
  await prisma.recruitCandidate.deleteMany().catch(() => {});
  return prisma.rhAnnouncement.deleteMany().catch(() => ({ count: 0 }));
});
await del('sequenceCounter', () => prisma.sequenceCounter.deleteMany());
await del('tickerMessage', () => prisma.tickerMessage.deleteMany());

const summary = {
  users: await prisma.user.count(),
  employees: await prisma.employee.count(),
  pricing: await prisma.articlePricingProfile.count(),
  clients: await prisma.client.count(),
  commandes: await prisma.commande.count(),
};
console.log('✅ Neon wipe done', summary);
await prisma.$disconnect();

import type { PrismaClient } from '@prisma/client';
import {
  commandeStatutFromLabel,
  devisStatutFromLabel,
  factureStatutFromLabel,
} from '@/lib/server/data/prisma-statut-bridge';

/** Devis, factures et paiements cohérents pour dashboard CA / rapports. */
export async function seedDashboardMetrics(prisma: PrismaClient) {
  const clients = await prisma.client.findMany({ take: 5, where: { statut: { in: ['Actif', 'Premium'] } } });
  const commandes = await prisma.commande.findMany({
    take: 8,
    where: {
      statut: {
        in: ['Livré', 'En production', 'En finition'].map(commandeStatutFromLabel),
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (clients.length === 0 || commandes.length === 0) {
    console.log('seedDashboardMetrics — clients/commandes insuffisants, skip');
    return;
  }

  const now = Date.now();
  const day = 86400000;

  const devisSpecs = [
    { numero: 'DV-2026-001', client: clients[0], statut: 'En attente', total: 620000 },
    { numero: 'DV-2026-002', client: clients[1] ?? clients[0], statut: 'Accepté', total: 450000 },
    { numero: 'DV-2026-003', client: clients[2] ?? clients[0], statut: 'Envoyé', total: 890000 },
  ];

  for (let i = 0; i < devisSpecs.length; i++) {
    const d = devisSpecs[i];
    const statut = devisStatutFromLabel(d.statut);
    await prisma.devis.upsert({
      where: { numero: d.numero },
      update: { statut, totalTTC: d.total, totalHT: d.total * 0.8 },
      create: {
        numero: d.numero,
        clientId: d.client.id,
        statut,
        totalTTC: d.total,
        totalHT: d.total * 0.8,
        sousTotal: d.total * 0.8,
        validUntil: new Date(now + 14 * day),
        createdAt: new Date(now - (i + 2) * day),
      },
    });
  }

  const cmd = commandes[0];
  const facStatut = factureStatutFromLabel('Partiellement payée');
  const fac = await prisma.facture.upsert({
    where: { numero: 'FAC-2026-001' },
    update: { statut: facStatut, totalTTC: cmd?.total ?? 450000 },
    create: {
      numero: 'FAC-2026-001',
      clientId: cmd?.clientId ?? clients[0].id,
      commandeId: cmd?.id,
      statut: facStatut,
      totalHT: (cmd?.total ?? 450000) * 0.8,
      totalTTC: cmd?.total ?? 450000,
      sousTotal: (cmd?.total ?? 450000) * 0.8,
      dateEmission: new Date(now - 5 * day),
      dateEcheance: new Date(now + 30 * day),
    },
  });

  const facPaidStatut = factureStatutFromLabel('Payée');
  const facPaid = await prisma.facture.upsert({
    where: { numero: 'FAC-2026-002' },
    update: { statut: facPaidStatut },
    create: {
      numero: 'FAC-2026-002',
      clientId: (clients[1] ?? clients[0]).id,
      commandeId: commandes[1]?.id,
      statut: facPaidStatut,
      totalHT: 360000,
      totalTTC: 450000,
      sousTotal: 360000,
      dateEmission: new Date(now - 12 * day),
    },
  });

  const paiements = [
    { numero: 'PAY-2026-001', montant: 225000, type: 'Acompte', daysAgo: 1, commandeId: commandes[0]?.id, clientId: commandes[0]?.clientId, factureId: fac.id },
    { numero: 'PAY-2026-002', montant: 180000, type: 'Solde', daysAgo: 0, commandeId: commandes[1]?.id, clientId: commandes[1]?.clientId, factureId: facPaid.id },
    { numero: 'PAY-2026-003', montant: 95000, type: 'Acompte', daysAgo: 2, commandeId: commandes[2]?.id, clientId: commandes[2]?.clientId },
    { numero: 'PAY-2026-004', montant: 320000, type: 'Solde', daysAgo: 3, commandeId: commandes[3]?.id, clientId: commandes[3]?.clientId },
    { numero: 'PAY-2026-005', montant: 125000, type: 'Acompte', daysAgo: 5, commandeId: commandes[4]?.id, clientId: commandes[4]?.clientId },
    { numero: 'PAY-2026-006', montant: 450000, type: 'Solde', daysAgo: 6, commandeId: commandes[5]?.id, clientId: commandes[5]?.clientId, factureId: facPaid.id },
    { numero: 'PAY-2026-007', montant: 78000, type: 'Acompte', daysAgo: 4, clientId: clients[2]?.id ?? clients[0].id },
  ];

  for (const p of paiements) {
    await prisma.paiement.upsert({
      where: { numero: p.numero },
      update: { montant: p.montant, datePaiement: new Date(now - p.daysAgo * day) },
      create: {
        numero: p.numero,
        montant: p.montant,
        type: p.type,
        mode: p.montant > 200000 ? 'Virement' : 'Espèces',
        commandeId: p.commandeId ?? null,
        clientId: p.clientId ?? null,
        factureId: p.factureId ?? null,
        datePaiement: new Date(now - p.daysAgo * day),
      },
    });
  }

  console.log(`${devisSpecs.length} devis + 2 factures + ${paiements.length} paiements dashboard seedés`);

  // Rafraîchir dates commandes pour graphiques période (top articles, peak hours)
  const sampleCmds = await prisma.commande.findMany({ take: 12, orderBy: { createdAt: 'desc' } });
  for (let i = 0; i < sampleCmds.length; i++) {
    const daysAgo = i % 7;
    await prisma.commande.update({
      where: { id: sampleCmds[i].id },
      data: { createdAt: new Date(now - daysAgo * day) },
    });
  }

  // Charges récentes pour graph CA vs dépenses
  const chargeCats = ['Matières', 'Énergie', 'Salaires', 'Maintenance', 'Marketing'];
  for (let i = 0; i < chargeCats.length; i++) {
    const category = chargeCats[i];
    const existing = await prisma.financeCharge.findFirst({ where: { category } });
    const payload = {
      label: `Charge ${category}`,
      category,
      amount: 120000 + i * 45000,
      dateCharge: new Date(now - (i % 5) * day),
    };
    if (existing) {
      await prisma.financeCharge.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.financeCharge.create({ data: payload });
    }
  }
}

import type { PrismaClient } from '@prisma/client';

export async function seedFinance(prisma: PrismaClient) {
  const existing = await prisma.financeCharge.count();
  if (existing > 0) {
    console.log('Finance charges déjà seedées — skip');
    return;
  }

  const charges = [
    { label: 'Loyer atelier AX0', category: 'Exploitation', amount: 850000 },
    { label: 'Électricité Konica + Roland', category: 'Exploitation', amount: 320000 },
    { label: 'Encre CMJN lot mensuel', category: 'Matière', amount: 540000 },
    { label: 'Papier offset 80g', category: 'Matière', amount: 280000 },
    { label: 'Maintenance Ricoh 9200', category: 'Maintenance', amount: 195000 },
    { label: 'Salaires équipe production', category: 'Salaire', amount: 4200000 },
    { label: 'Facebook Ads ANS Design', category: 'Marketing', amount: 150000 },
  ];

  for (const c of charges) {
    await prisma.financeCharge.create({ data: c });
  }

  const stockItem = await prisma.stockItem.findFirst({ where: { quantity: { gt: 5 } } });
  const client = await prisma.client.findFirst({ where: { statut: 'Actif' } });

  await prisma.stockDirectSale.create({
    data: {
      label: 'Papier A4 80g — vente comptoir',
      quantity: 2,
      unitPrice: 12500,
      total: 25000,
      mode: 'Espèces',
      stockItemId: stockItem?.id ?? null,
      clientId: client?.id ?? null,
      soldByName: 'Admin ANS',
    },
  });

  console.log(`${charges.length} charges + 1 vente directe seedées`);
}

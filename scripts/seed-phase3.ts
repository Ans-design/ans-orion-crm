import { PrismaClient } from '@prisma/client';
import { DEFAULT_MATERIALS, MATERIALS_CONFIG_KEY } from '../lib/data/materials-config';

const SUPPLIERS = [
  { code: 'FOU-001', name: 'Paperland Madagascar', tel: '+261 20 22 123 45', email: 'contact@paperland.mg', ville: 'Antananarivo', categorie: 'Papier', contact: 'M. Rakoto' },
  { code: 'FOU-002', name: 'Encre Pro MG', tel: '+261 34 12 345 67', email: 'ventes@encrepro.mg', ville: 'Antananarivo', categorie: 'Encre', contact: 'Mme Rabe' },
  { code: 'FOU-003', name: 'Textile Import SARL', tel: '+261 32 98 765 43', email: 'info@textileimport.mg', ville: 'Toamasina', categorie: 'Textile', contact: 'M. Andry' },
];

export async function seedPhase3(prisma: PrismaClient) {
  for (const s of SUPPLIERS) {
    await prisma.supplier.upsert({
      where: { code: s.code },
      update: { name: s.name, tel: s.tel, email: s.email, ville: s.ville, categorie: s.categorie, contact: s.contact, statut: 'Actif' },
      create: { ...s, statut: 'Actif' },
    });
  }

  const paperland = await prisma.supplier.findUnique({ where: { code: 'FOU-001' } });
  if (paperland) {
    const existing = await prisma.purchaseOrder.findFirst({ where: { numero: { startsWith: 'ACH-2026' } } });
    if (!existing) {
      const year = new Date().getFullYear();
      await prisma.purchaseOrder.create({
        data: {
          numero: `ACH-${year}-000001`,
          supplierId: paperland.id,
          statut: 'Commandé',
          totalHT: 850000,
          expectedAt: new Date(Date.now() + 7 * 86400000),
          lignes: {
            create: [
              { label: 'Papier couché brillant 170g (5000 feuilles)', qty: 5000, unitCost: 85, total: 425000, sortOrder: 0 },
              { label: 'Offset 80g (5000 feuilles)', qty: 5000, unitCost: 85, total: 425000, sortOrder: 1 },
            ],
          },
        },
      });
    }
  }

  const slotCount = await prisma.productionSlot.count();
  if (slotCount === 0) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(12, 0, 0, 0);
    await prisma.productionSlot.create({
      data: {
        title: 'Impression offset — batch matin',
        machine: 'Offset Heidelberg',
        operateur: 'Jean',
        startAt: tomorrow,
        endAt: end,
        statut: 'Planifié',
      },
    });
  }

  await prisma.systemConfig.upsert({
    where: { configKey: MATERIALS_CONFIG_KEY },
    create: { configKey: MATERIALS_CONFIG_KEY, data: DEFAULT_MATERIALS as object },
    update: {},
  });

  console.log(`${SUPPLIERS.length} fournisseurs seedés + achat demo + planning slot`);
}

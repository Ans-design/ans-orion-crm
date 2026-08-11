import { PrismaClient } from '@prisma/client';

const PAPER_STOCK = [
  { sku: 'PAP-PCB-135', label: 'Papier couché brillant 135g', paperType: 'PCB', grammage: '135g', quantity: 5000, minQty: 500 },
  { sku: 'PAP-PCB-170', label: 'Papier couché brillant 170g', paperType: 'PCB', grammage: '170g', quantity: 3200, minQty: 400 },
  { sku: 'PAP-PCB-250', label: 'Papier couché brillant 250g', paperType: 'PCB', grammage: '250g', quantity: 1800, minQty: 300 },
  { sku: 'PAP-PCB-350', label: 'Papier couché brillant 350g', paperType: 'PCB', grammage: '350g', quantity: 1200, minQty: 200 },
  { sku: 'PAP-PCB-600', label: 'Papier couché brillant 600g', paperType: 'PCB', grammage: '600g', quantity: 800, minQty: 100 },
  { sku: 'PAP-PCB-700', label: 'Papier couché brillant 700g', paperType: 'PCB', grammage: '700g', quantity: 600, minQty: 80 },
  { sku: 'PAP-PCM-130', label: 'Papier couché mat 130g', paperType: 'PCM', grammage: '130g', quantity: 4500, minQty: 500 },
  { sku: 'PAP-PCM-135', label: 'Papier couché mat 135g', paperType: 'PCM', grammage: '135g', quantity: 4200, minQty: 500 },
  { sku: 'PAP-PCM-170', label: 'Papier couché mat 170g', paperType: 'PCM', grammage: '170g', quantity: 2100, minQty: 400 },
  { sku: 'PAP-OFF-80', label: 'Offset 80g', paperType: 'Offset', grammage: '80g', quantity: 8000, minQty: 1000 },
  { sku: 'PAP-OFF-90', label: 'Offset 90g', paperType: 'Offset', grammage: '90g', quantity: 7000, minQty: 900 },
  { sku: 'PAP-OFF-100', label: 'Offset 100g', paperType: 'Offset', grammage: '100g', quantity: 6000, minQty: 800 },
  { sku: 'PAP-OFF-120', label: 'Offset 120g', paperType: 'Offset', grammage: '120g', quantity: 5000, minQty: 700 },
  { sku: 'PAP-BRI-250', label: 'Bristol 250g', paperType: 'Bristol', grammage: '250g', quantity: 900, minQty: 200 },
  { sku: 'PAP-BRI-300', label: 'Bristol 300g', paperType: 'Bristol', grammage: '300g', quantity: 45, minQty: 100 },
  { sku: 'PAP-GLS-250', label: 'Glossy 250g', paperType: 'Glossy', grammage: '250g', quantity: 1500, minQty: 200 },
  { sku: 'PAP-GLS-300', label: 'Glossy 300g', paperType: 'Glossy', grammage: '300g', quantity: 1100, minQty: 150 },
];

export async function seedStock(prisma: PrismaClient) {
  for (const s of PAPER_STOCK) {
    await prisma.stockItem.upsert({
      where: { sku: s.sku },
      update: {
        label: s.label,
        paperType: s.paperType,
        grammage: s.grammage,
        quantity: s.quantity,
        minQty: s.minQty,
        category: 'Papier',
        actif: true,
      },
      create: {
        sku: s.sku,
        label: s.label,
        category: 'Papier',
        paperType: s.paperType,
        grammage: s.grammage,
        unit: 'feuille',
        quantity: s.quantity,
        minQty: s.minQty,
        supplier: 'Paperland MG',
        actif: true,
      },
    });
  }
  console.log(`${PAPER_STOCK.length} articles stock papier seedés`);

  const cmd = await prisma.commande.findFirst({ orderBy: { createdAt: 'desc' } });
  const reserveItems = await prisma.stockItem.findMany({ take: 3, orderBy: { quantity: 'desc' } });
  for (const [i, item] of reserveItems.entries()) {
    const qty = 120 + i * 80;
    const existing = await prisma.stockReservation.findFirst({
      where: { stockItemId: item.id, status: 'active' },
    });
    if (!existing) {
      await prisma.stockReservation.create({
        data: {
          stockItemId: item.id,
          commandeId: cmd?.id ?? null,
          quantity: qty,
          unit: item.unit,
          status: 'active',
        },
      });
    }
    await prisma.stockItem.update({
      where: { id: item.id },
      data: { reservedQty: qty },
    });
  }
  if (reserveItems.length) console.log(`${reserveItems.length} réservations stock seedées`);
}

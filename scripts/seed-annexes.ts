import type { PrismaClient } from '@prisma/client';
import { seedDefaultAnnexes } from '@/lib/services/annex-service';

export async function seedAnnexes(prisma: PrismaClient) {
  await seedDefaultAnnexes(prisma);
  console.log('Annexes AX0/AX1 seedées');

  const employees = await prisma.employee.findMany({ take: 6, orderBy: { matricule: 'asc' } });
  if (employees.length >= 2) {
    await prisma.employee.update({ where: { id: employees[1].id }, data: { site: 'AX1' } });
    if (employees[3]) await prisma.employee.update({ where: { id: employees[3].id }, data: { site: 'AX1' } });
  }

  const machines = await prisma.machine.findMany({ take: 4 });
  if (machines[1]) await prisma.machine.update({ where: { id: machines[1].id }, data: { site: 'AX1' } });

  const commandes = await prisma.commande.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  for (const c of commandes.slice(0, 2)) {
    await prisma.commande.update({ where: { id: c.id }, data: { site: 'AX1' } });
  }

  const stock = await prisma.stockItem.findFirst({ where: { actif: true } });
  if (stock) {
    const sku = `${stock.sku}-AX1`;
    await prisma.stockItem.upsert({
      where: { sku },
      update: {
        label: `${stock.label} (AX1)`,
        category: stock.category,
        site: 'AX1',
      },
      create: {
        sku,
        label: `${stock.label} (AX1)`,
        category: stock.category,
        quantity: 50,
        minQty: 10,
        site: 'AX1',
      },
    });
  }

  console.log('Répartition multi-sites : employés, machines, commandes AX1');
}

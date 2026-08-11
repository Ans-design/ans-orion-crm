import { prisma } from '@/lib/prisma';
import { DEFAULT_ANNEXES, SITE_FILTER_ALL } from '@/lib/constants/annex';
import { adjustStock } from '@/lib/services/stock-service';

export { DEFAULT_ANNEXES, ANNEXE_STATUTS, SITE_FILTER_ALL } from '@/lib/constants/annex';

export async function listSiteAnnexes() {
  return prisma.siteAnnexe.findMany({ orderBy: [{ isDefault: 'desc' }, { code: 'asc' }] });
}

export async function createSiteAnnexe(data: {
  code: string;
  name: string;
  adresse?: string | null;
  ville?: string | null;
  tel?: string | null;
  notes?: string | null;
}) {
  return prisma.siteAnnexe.create({
    data: {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      adresse: data.adresse?.trim() || null,
      ville: data.ville?.trim() || null,
      tel: data.tel?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });
}

export async function updateSiteAnnexe(
  id: string,
  data: Partial<{ name: string; adresse: string | null; ville: string | null; tel: string | null; statut: string; notes: string | null }>,
) {
  return prisma.siteAnnexe.update({ where: { id }, data });
}

export async function getSiteStats(site?: string) {
  const siteFilter = site && site !== SITE_FILTER_ALL ? { site } : undefined;

  const [commandes, productions, machines, stockItems, employees] = await Promise.all([
    prisma.commande.count({ where: siteFilter }),
    prisma.production.count({ where: siteFilter }),
    prisma.machine.count({ where: siteFilter }),
    prisma.stockItem.count({ where: { ...siteFilter, actif: true } }),
    prisma.employee.count({ where: site && site !== SITE_FILTER_ALL ? { site } : { statut: 'Actif' } }),
  ]);

  return { commandes, productions, machines, stockItems, employees };
}

export async function getAnnexOverview() {
  const annexes = await listSiteAnnexes();
  const overview = await Promise.all(
    annexes.map(async (a) => ({
      code: a.code,
      name: a.name,
      statut: a.statut,
      isDefault: a.isDefault,
      stats: await getSiteStats(a.code),
    })),
  );
  return overview;
}

export async function assignEmployeeToSite(employeeId: string, site: string) {
  const annexe = await prisma.siteAnnexe.findUnique({ where: { code: site } });
  if (!annexe) throw new Error('Annexe introuvable');

  return prisma.employee.update({
    where: { id: employeeId },
    data: { site },
  });
}

export async function transferStockToSite(stockItemId: string, targetSite: string, quantity: number, userName?: string) {
  const annexe = await prisma.siteAnnexe.findUnique({ where: { code: targetSite } });
  if (!annexe) throw new Error('Annexe cible introuvable');

  const item = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
  if (!item) throw new Error('Article stock introuvable');
  if (item.site === targetSite) throw new Error('Déjà sur cette annexe');
  if (quantity <= 0 || quantity > item.quantity) throw new Error('Quantité invalide');

  const transferRef = `TRF-${stockItemId}-${targetSite}-${quantity}`;

  return prisma.$transaction(async (tx) => {
    // Sortie source via adjustStock (idempotence + anti-oversell)
    await adjustStock(
      {
        stockItemId,
        type: 'sortie',
        movementType: 'transfert',
        quantity,
        reference: transferRef,
        notes: `Transfert annexe ${item.site} → ${targetSite}`,
        userName,
      },
      tx,
    );

    const targetSku = `${item.sku}-${targetSite}`;
    const existing = await tx.stockItem.findUnique({ where: { sku: targetSku } });
    if (existing) {
      // movementType 'entree' (pas 'transfert' — mappé sortie dans stock-quantity)
      await adjustStock(
        {
          stockItemId: existing.id,
          type: 'entree',
          movementType: 'entree',
          quantity,
          reference: `${transferRef}-IN`,
          notes: `Réception transfert depuis ${item.site}`,
          userName,
        },
        tx,
      );
    } else {
      await tx.stockItem.create({
        data: {
          sku: targetSku,
          label: item.label,
          category: item.category,
          paperType: item.paperType,
          grammage: item.grammage,
          unit: item.unit,
          quantity,
          minQty: item.minQty,
          unitCost: item.unitCost,
          supplier: item.supplier,
          site: targetSite,
        },
      });
    }

    return { from: item.site, to: targetSite, quantity };
  });
}

export async function getUserSiteFilter(userId: string): Promise<string> {
  const pref = await prisma.userPreference.findUnique({
    where: { userId_category: { userId, category: 'workspace_site' } },
  });
  const data = pref?.data as { activeSite?: string } | undefined;
  return data?.activeSite ?? SITE_FILTER_ALL;
}

export async function setUserSiteFilter(userId: string, activeSite: string) {
  return prisma.userPreference.upsert({
    where: { userId_category: { userId, category: 'workspace_site' } },
    create: { userId, category: 'workspace_site', data: { activeSite } },
    update: { data: { activeSite } },
  });
}

export async function seedDefaultAnnexes(prismaClient: typeof prisma) {
  for (const a of DEFAULT_ANNEXES) {
    await prismaClient.siteAnnexe.upsert({
      where: { code: a.code },
      update: { name: a.name, ville: a.ville, isDefault: a.isDefault },
      create: {
        code: a.code,
        name: a.name,
        ville: a.ville,
        isDefault: a.isDefault,
        adresse: a.code === 'AX0' ? 'Lot II M 31 Andravoahangy' : 'Zone Ivato',
      },
    });
  }
}

export async function backfillSiteFields(defaultSite = 'AX0') {
  await Promise.all([
    prisma.commande.updateMany({ where: { site: { not: defaultSite } }, data: {} }).catch(() => null),
    prisma.machine.updateMany({ where: { site: defaultSite }, data: {} }).catch(() => null),
  ]);

  const [cmdNull, prodNull, machNull, stockNull] = await Promise.all([
    prisma.commande.count(),
    prisma.production.count(),
    prisma.machine.count(),
    prisma.stockItem.count(),
  ]);

  return { commandes: cmdNull, productions: prodNull, machines: machNull, stockItems: stockNull, defaultSite };
}

export async function getAnnexSyncStats() {
  const annexes = await listSiteAnnexes();
  const totalAnnexes = annexes.length;
  const overview = await getAnnexOverview();
  const employeesBySite = await prisma.employee.groupBy({
    by: ['site'],
    where: { statut: 'Actif' },
    _count: true,
  });

  return {
    totalAnnexes,
    overview,
    employeesBySite: Object.fromEntries(employeesBySite.map((e) => [e.site, e._count])),
  };
}

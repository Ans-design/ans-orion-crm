import type { PrismaClient } from '@prisma/client';

const MACHINES = [
  { code: 'SM-74', name: 'Heidelberg Speedmaster SM 74', category: 'impression', status: 'running', utilization: 78, nextMaintenanceDays: 14 },
  { code: 'IND-7900', name: 'HP Indigo 7900', category: 'impression', status: 'maintenance', utilization: 0, nextMaintenanceDays: 2 },
  { code: 'POL-115', name: 'Polar 115 Guillotine', category: 'decoupe', status: 'ok', utilization: 45, nextMaintenanceDays: 21 },
  { code: 'HOR-137', name: 'Horizon Stitchliner', category: 'finition', status: 'running', utilization: 62, nextMaintenanceDays: 10 },
  { code: 'LAM-340', name: 'Komfi Lam 340', category: 'finition', status: 'waiting', utilization: 12, nextMaintenanceDays: 30 },
  { code: 'NUM-320', name: 'Konica Minolta AccurioPress', category: 'impression', status: 'ok', utilization: 55, nextMaintenanceDays: 18 },
  { code: 'PLI-512', name: 'MBO K800 Plieuse', category: 'finition', status: 'down', utilization: 0, nextMaintenanceDays: null },
];

const RECLAMATIONS = [
  { clientCode: 'OM-005', subject: 'Décalage couleur sur flyer PLV', priorite: 'Haute', statut: 'En cours' },
  { clientCode: 'HC-003', subject: 'Retard livraison menus événement', priorite: 'Urgente', statut: 'Ouverte' },
  { clientCode: 'QS-001', subject: 'Cartes de visite — finition mate non conforme', priorite: 'Normale', statut: 'Ouverte' },
];

export async function seedOps(prisma: PrismaClient) {
  const now = new Date();

  for (const m of MACHINES) {
    const nextMaintenance = m.nextMaintenanceDays != null
      ? new Date(now.getTime() + m.nextMaintenanceDays * 86400000)
      : null;
    await prisma.machine.upsert({
      where: { code: m.code },
      update: {
        name: m.name,
        category: m.category,
        status: m.status,
        utilization: m.utilization,
        nextMaintenance,
      },
      create: {
        code: m.code,
        name: m.name,
        category: m.category,
        status: m.status,
        utilization: m.utilization,
        nextMaintenance,
        notes: m.status === 'down' ? 'Panne moteur — pièce en commande' : null,
      },
    });
  }
  console.log(`${MACHINES.length} machines seedées`);

  for (const r of RECLAMATIONS) {
    const client = await prisma.client.findUnique({ where: { code: r.clientCode } });
    if (!client) continue;
    const existing = await prisma.clientReclamation.findFirst({
      where: { clientId: client.id, subject: r.subject },
    });
    if (existing) {
      await prisma.clientReclamation.update({
        where: { id: existing.id },
        data: { priorite: r.priorite, statut: r.statut },
      });
    } else {
      await prisma.clientReclamation.create({
        data: {
          clientId: client.id,
          subject: r.subject,
          description: 'Réclamation démo — qualité / délai',
          priorite: r.priorite,
          statut: r.statut,
        },
      });
    }
  }
  console.log(`${RECLAMATIONS.length} réclamations seedées`);
}

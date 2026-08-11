import type { PrismaClient } from '@prisma/client';

const EQUIPMENTS = [
  { code: 'PC-GRA01', name: 'MacBook Pro M3 — Studio', category: 'ordinateur', marque: 'Apple', etat: 'affecte', poste: 'Studio Création', matricule: 'GRA01' },
  { code: 'TAB-LOG01', name: 'Samsung Tab Active — Livreur', category: 'tablette', marque: 'Samsung', etat: 'affecte', poste: 'Logistique', matricule: 'LOG01' },
  { code: 'TEL-COM01', name: 'iPhone 14 Pro — Commercial', category: 'telephone', marque: 'Apple', etat: 'affecte', poste: 'Commercial', matricule: 'COM01' },
  { code: 'MOTO-LOG02', name: 'Yamaha NMAX — Livraison', category: 'moto', marque: 'Yamaha', etat: 'affecte', poste: 'Logistique', matricule: 'LOG01' },
  { code: 'KIT-TECH01', name: 'Kit diagnostic technicien', category: 'kit_technicien', marque: 'ANS', etat: 'affecte', poste: 'Maintenance', matricule: 'TECH01' },
  { code: 'PC-ADM01', name: 'Dell Latitude — Admin', category: 'ordinateur', marque: 'Dell', etat: 'affecte', poste: 'Direction', matricule: 'ADM01' },
  { code: 'EPI-LIV01', name: 'Casque + gilet livreur', category: 'epi', marque: 'ANS', etat: 'affecte', poste: 'Logistique', matricule: 'LOG01' },
  { code: 'LIC-ADOBE', name: 'Adobe Creative Cloud — 5 licences', category: 'licence', marque: 'Adobe', etat: 'affecte', poste: 'Studio Création' },
  { code: 'TAB-ACC01', name: 'iPad Accueil client', category: 'tablette', marque: 'Apple', etat: 'affecte', poste: 'Accueil', matricule: 'ACC01' },
  { code: 'PC-STOCK', name: 'PC Magasinier stock', category: 'ordinateur', marque: 'HP', etat: 'disponible', poste: 'Stock' },
];

export async function seedMateriels(prisma: PrismaClient) {
  for (const e of EQUIPMENTS) {
    let employeeId: string | null = null;
    if (e.matricule) {
      const emp = await prisma.employee.findUnique({ where: { matricule: e.matricule } });
      employeeId = emp?.id ?? null;
    }
    await prisma.equipment.upsert({
      where: { code: e.code },
      update: {
        name: e.name,
        category: e.category,
        marque: e.marque,
        etat: e.etat,
        poste: e.poste,
        employeeId,
        site: 'AX0',
      },
      create: {
        code: e.code,
        name: e.name,
        category: e.category,
        marque: e.marque,
        etat: e.etat,
        poste: e.poste,
        employeeId,
        site: 'AX0',
        prixAchat: e.category === 'licence' ? 450000 : e.category === 'moto' ? 8500000 : 3200000,
        dateAchat: new Date('2024-06-01'),
      },
    });
  }

  const machines = await prisma.machine.findMany({ where: { status: { in: ['down', 'maintenance'] } }, take: 2 });
  const tech = await prisma.employee.findFirst({ where: { matricule: 'TECH01' } });

  const tickets = [
    { numero: 'TKT-2026-001', titre: 'Panne moteur plieuse MBO K800', type: 'panne', priorite: 'Urgente', statut: 'En cours', machineCode: 'PLI-512', impactPlanning: true },
    { numero: 'TKT-2026-002', titre: 'Maintenance préventive HP Indigo', type: 'preventive', priorite: 'Normale', statut: 'Ouvert', machineCode: 'IND-7900', impactPlanning: false },
    { numero: 'TKT-2026-003', titre: 'Écran MacBook graphiste — pixels morts', type: 'panne', priorite: 'Normale', statut: 'Ouvert', equipmentCode: 'PC-GRA01', impactPlanning: false },
  ];

  for (const t of tickets) {
    const machine = t.machineCode
      ? await prisma.machine.findUnique({ where: { code: t.machineCode } })
      : null;
    const equipment = t.equipmentCode
      ? await prisma.equipment.findUnique({ where: { code: t.equipmentCode } })
      : null;
    await prisma.maintenanceTicket.upsert({
      where: { numero: t.numero },
      update: {
        titre: t.titre,
        type: t.type,
        priorite: t.priorite,
        statut: t.statut,
        machineId: machine?.id ?? null,
        equipmentId: equipment?.id ?? null,
        assigneeId: tech?.id ?? null,
        impactPlanning: t.impactPlanning,
      },
      create: {
        numero: t.numero,
        titre: t.titre,
        type: t.type,
        priorite: t.priorite,
        statut: t.statut,
        description: `Ticket auto-seed — ${t.titre}`,
        machineId: machine?.id ?? null,
        equipmentId: equipment?.id ?? null,
        assigneeId: tech?.id ?? null,
        reportedBy: 'Système GPAO',
        impactPlanning: t.impactPlanning,
      },
    });
  }

  const proofs = await prisma.proof.findMany({ take: 3 });
  for (const [i, proof] of proofs.entries()) {
    const count = await prisma.proofVersion.count({ where: { proofId: proof.id } });
    if (count === 0) {
      await prisma.proofVersion.createMany({
        data: [
          { proofId: proof.id, versionLabel: 'V1', statut: 'Envoyé', createdBy: 'Graphiste', notes: 'Première version BAT' },
          { proofId: proof.id, versionLabel: 'V2', statut: i === 0 ? 'Validé' : 'En attente', createdBy: 'Graphiste', notes: 'Corrections client' },
        ],
      });
    }
  }

  console.log(`${EQUIPMENTS.length} matériels + ${tickets.length} tickets maintenance seedés`);
}

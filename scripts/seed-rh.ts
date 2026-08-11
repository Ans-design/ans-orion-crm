import type { PrismaClient } from '@prisma/client';
import { ANS_EMPLOYEES_MASTER } from '@/lib/data/ans-employees-master';
import { startOfDay } from '@/lib/services/rh-service';

export async function seedRh(prisma: PrismaClient) {
  const existing = await prisma.employee.count();
  if (existing > 0) {
    console.log(`${existing} employés déjà seedés — skip (utiliser scripts/sync-ans-employees.ts pour aligner Excel)`);
    return;
  }

  for (const emp of ANS_EMPLOYEES_MASTER) {
    const notes = [
      emp.adresse ? `Adresse: ${emp.adresse}` : null,
      emp.dateNaissance ? `Né(e): ${emp.dateNaissance}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    await prisma.employee.create({
      data: {
        matricule: emp.matricule,
        firstName: emp.firstName,
        lastName: emp.lastName,
        poste: emp.poste,
        departement: emp.departement,
        authRole: emp.authRole,
        tel: emp.tel,
        site: 'AX0',
        statut: 'Actif',
        presenceStatut: 'Absent',
        dateEmbauche: emp.dateEmbauche ? new Date(emp.dateEmbauche) : null,
        notes: notes || null,
        horaireDebut: '08:00',
        horaireFin: '17:00',
      },
    });
  }

  const employees = await prisma.employee.findMany({
    where: { statut: 'Actif' },
    take: 4,
    orderBy: { matricule: 'asc' },
  });
  const today = startOfDay();

  for (const emp of employees.slice(0, 2)) {
    await prisma.employeePresence.create({
      data: {
        employeeId: emp.id,
        date: today,
        checkIn: new Date(today.getTime() + 8 * 3600000),
        statut: 'Présent',
        retardMin: 0,
      },
    });
  }

  if (employees[2]) {
    await prisma.employeeAbsence.create({
      data: {
        employeeId: employees[2].id,
        type: 'Congé payé',
        dateDebut: new Date(today.getTime() + 7 * 86400000),
        dateFin: new Date(today.getTime() + 10 * 86400000),
        statut: 'En attente',
        motif: 'Congés annuels',
      },
    });
  }

  await prisma.rhAnnouncement.create({
    data: {
      title: 'Réunion équipe — lundi 8h',
      content: 'Point hebdomadaire production + commercial en salle réunion AX0.',
      priority: 'Important',
      authorName: 'Admin ANS',
      pinned: true,
    },
  });

  await prisma.rhAnnouncement.create({
    data: {
      title: 'Nouveau processus pointage Orion',
      content: 'Utilisez la page Employés pour pointer entrée/sortie chaque jour.',
      priority: 'Normal',
      authorName: 'RH ANS',
    },
  });

  console.log(`${ANS_EMPLOYEES_MASTER.length} employés ANS seedés (liste Excel exacte)`);
}

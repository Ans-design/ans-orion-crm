import type { PrismaClient } from '@prisma/client';
import { ORION_V29_PROFILES } from '@/lib/orion-v29-accounts';

/** Upsert fiches employé v29 HTML — matricules DIRECTEUR, DIR01, etc. (sans secrets). */
export async function seedV29Employees(prisma: PrismaClient) {
  for (const acc of ORION_V29_PROFILES) {
    await prisma.employee.upsert({
      where: { matricule: acc.matricule },
      create: {
        matricule: acc.matricule,
        firstName: acc.name.split(' ')[0] ?? acc.name,
        lastName: acc.name.split(' ').slice(1).join(' ') || acc.name,
        poste: acc.poste,
        departement: acc.departement,
        authRole: acc.role,
        email: acc.email,
        horaireDebut: '08:00',
        horaireFin: '17:00',
        site: 'AX0',
        statut: 'Actif',
        presenceStatut: 'Absent',
        dateEmbauche: new Date('2022-06-01'),
      },
      update: {
        poste: acc.poste,
        departement: acc.departement,
        authRole: acc.role,
        email: acc.email,
        horaireDebut: '08:00',
      },
    });
  }
  console.log(`${ORION_V29_PROFILES.length} employés v29 HTML upsertés`);
}

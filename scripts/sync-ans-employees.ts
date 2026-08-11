/**
 * Synchronise la liste exacte des employés ANS (Excel) vers Prisma.
 * - Upsert les 14 fiches ANS-xxx (noms, postes, tél, horaires, départements)
 * - Désactive (Inactif) les anciens seeds fictifs non présents dans la liste
 *
 * Usage: npx tsx scripts/sync-ans-employees.ts
 */
process.env.APP_ENV = 'local';
process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();

const AVATAR_COLORS = ['#cc0033', '#2563eb', '#16a34a', '#ca8a04', '#7c3aed', '#0891b2', '#ea580c', '#db2777'];

function avatarColorFor(matricule: string) {
  let h = 0;
  for (let i = 0; i < matricule.length; i++) h = (h + matricule.charCodeAt(i) * 17) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h]!;
}

async function main() {
  const { prisma } = await import('../lib/prisma');
  const { ANS_EMPLOYEES_MASTER } = await import('../lib/data/ans-employees-master');

  const keepMatricules = new Set(ANS_EMPLOYEES_MASTER.map((e) => e.matricule));
  let upserted = 0;

  for (const emp of ANS_EMPLOYEES_MASTER) {
    const notes = [
      emp.adresse ? `Adresse: ${emp.adresse}` : null,
      emp.dateNaissance ? `Né(e): ${emp.dateNaissance}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    const color = avatarColorFor(emp.matricule);

    await prisma.employee.upsert({
      where: { matricule: emp.matricule },
      create: {
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
        avatarColor: color,
      },
      update: {
        firstName: emp.firstName,
        lastName: emp.lastName,
        poste: emp.poste,
        departement: emp.departement,
        authRole: emp.authRole,
        tel: emp.tel,
        site: 'AX0',
        statut: 'Actif',
        dateEmbauche: emp.dateEmbauche ? new Date(emp.dateEmbauche) : null,
        notes: notes || null,
        horaireDebut: '08:00',
        horaireFin: '17:00',
        avatarColor: color,
      },
    });
    upserted += 1;
  }

  const others = await prisma.employee.findMany({
    where: { matricule: { notIn: [...keepMatricules] } },
    select: { id: true, matricule: true, statut: true, userId: true },
  });

  let deactivated = 0;
  for (const o of others) {
    if (o.userId) continue;
    if (o.statut === 'Inactif') continue;
    if (/^ANS-\d{3}$/.test(o.matricule)) continue;
    await prisma.employee.update({
      where: { id: o.id },
      data: {
        statut: 'Inactif',
        notes: `${o.matricule} · Hors liste employés ANS Excel — désactivé (sync)`,
      },
    });
    deactivated += 1;
  }

  console.log(`OK — ${upserted} employés ANS upsertés, ${deactivated} fiches hors-liste désactivées`);
  console.log(
    ANS_EMPLOYEES_MASTER.map((e) => `${e.matricule} | ${e.lastName} ${e.firstName} | ${e.departement} | ${e.poste}`).join('\n'),
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

process.env.APP_ENV = 'local';
process.env.DATABASE_URL = 'file:./prisma/dev.db';

async function main() {
  const { prisma } = await import('../lib/prisma');
  const a = await prisma.employee.findMany({
    where: { statut: 'Actif', matricule: { startsWith: 'ANS-' } },
    orderBy: { matricule: 'asc' },
    select: { matricule: true, lastName: true, firstName: true, poste: true, tel: true },
  });
  console.log(`Actifs ANS: ${a.length}`);
  for (const x of a) console.log(`${x.matricule} | ${x.lastName} ${x.firstName} | ${x.poste} | ${x.tel}`);

  const mats = await prisma.baseMaterial.findMany({
    where: {
      OR: [
        { label: { contains: 'Adestor' } },
        { label: { contains: 'adhestor' } },
        { grammage: { contains: '600g (300g' } },
      ],
    },
    select: { materialKey: true, label: true, grammage: true },
    take: 20,
  });
  console.log('Legacy labels restants:', mats.length, mats);

  const { IMPRESSION_SF_MATIERE_LABELS, IMPRESSION_SF_WEIGHTS_BY_MATIERE } = await import(
    '../lib/data/impression-sf-material-catalog'
  );
  console.log('Catalogue ISF matières:', IMPRESSION_SF_MATIERE_LABELS.join(' · '));
  console.log('PCB grammages:', IMPRESSION_SF_WEIGHTS_BY_MATIERE.PCB?.join(', '));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

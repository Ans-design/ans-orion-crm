/**
 * Aligne les libellés BaseMaterial / BasePrintingPrice ISF sur Excel 2026.
 * - Autocollant Adestor → Papier adhestor
 * - 600g (300g×2) → 600g
 *
 * Usage: npx tsx scripts/sync-isf-excel-labels.ts
 */
process.env.APP_ENV = 'local';
process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();

async function main() {
  const { prisma } = await import('../lib/prisma');

  let renamedMats = 0;
  let renamedGrams = 0;
  let renamedBpp = 0;

  const adestorRows = await prisma.baseMaterial.findMany({
    where: {
      OR: [
        { label: { contains: 'Adestor' } },
        { label: { contains: 'adhestor' } },
        { displayName: { contains: 'Adestor' } },
      ],
    },
  });

  for (const row of adestorRows) {
    const nextLabel = String(row.label ?? '').replace(/Autocollant Adestor/gi, 'Papier adhestor');
    const nextDisplay = String(row.displayName ?? '').replace(/Autocollant Adestor/gi, 'Papier adhestor');
    if (nextLabel !== row.label || nextDisplay !== (row.displayName ?? '')) {
      await prisma.baseMaterial.update({
        where: { id: row.id },
        data: {
          label: nextLabel || 'Papier adhestor',
          displayName: nextDisplay || 'Papier adhestor',
        },
      });
      renamedMats += 1;
    }
  }

  const gramRows = await prisma.baseMaterial.findMany({
    where: {
      OR: [
        { grammage: { contains: '300g' } },
        { label: { contains: '600g (300g' } },
      ],
    },
  });

  for (const row of gramRows) {
    const g = String(row.grammage ?? '');
    const label = String(row.label ?? '');
    const nextG = g.replace(/600g\s*\(300g\s*[×xX]2\)/gi, '600g');
    const nextLabel = label.replace(/600g\s*\(300g\s*[×xX]2\)/gi, '600g');
    if ((nextG !== g && /600g/.test(nextG)) || nextLabel !== label) {
      if (nextG === g && nextLabel === label) continue;
      if (!/600g\s*\(300g/i.test(g) && !/600g\s*\(300g/i.test(label)) continue;
      await prisma.baseMaterial.update({
        where: { id: row.id },
        data: {
          ...(nextG !== g ? { grammage: nextG } : {}),
          ...(nextLabel !== label ? { label: nextLabel } : {}),
        },
      });
      renamedGrams += 1;
    }
  }

  const bpp = await prisma.basePrintingPrice.findMany({
    where: {
      OR: [
        { materialKey: { contains: 'Adestor' } },
        { materialKey: { contains: 'adhestor' } },
        { grammage: { contains: '300g' } },
      ],
    },
  });

  for (const row of bpp) {
    const mk = String(row.materialKey ?? '').replace(/Autocollant Adestor/gi, 'Papier adhestor');
    const g = String(row.grammage ?? '').replace(/600g\s*\(300g\s*[×xX]2\)/gi, '600g');
    const changedMk = mk !== row.materialKey;
    const changedG = g !== row.grammage && /600g\s*\(300g/i.test(String(row.grammage ?? ''));
    if (changedMk || changedG) {
      await prisma.basePrintingPrice.update({
        where: { id: row.id },
        data: {
          ...(changedMk ? { materialKey: mk } : {}),
          ...(changedG ? { grammage: g } : {}),
        },
      });
      renamedBpp += 1;
    }
  }

  console.log(
    `OK ISF labels — BaseMaterial: ${renamedMats} adhestor, ${renamedGrams} grammage; BasePrintingPrice: ${renamedBpp}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

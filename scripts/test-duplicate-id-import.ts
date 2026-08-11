import { importMaterialsFromExcel } from '../lib/server/modules/materials/materials-excel-import.service';
import { prisma } from '../lib/prisma';

const ID = 'cmr874ilu000jtlc8ntvp2g36';

async function main() {
  // Scénario utilisateur : 2 lignes jaunes modifiées + ligne originale Acrylic plus bas (même ID)
  const rows = [
    {
      Matière: 'ANDRANA',
      'Type caracté': 'Épaisseur',
      Valeur: '3mm',
      Famille: 'Grand format',
      'Prix base': 500000,
      'Unité prix': 'pcs',
      'Référence pri': 'ACRYLIC',
      'POS actif': 'oui',
      ID,
    },
    {
      Matière: 'AAATEST',
      'Type caracté': 'Épaisseur',
      Valeur: 'gfdnghn',
      Famille: 'fdgbgshb',
      'Prix base': 500,
      'Unité prix': 'nhgn',
      'Référence pri': 'hg',
      'POS actif': 'ghn',
      ID,
    },
    {
      Matière: 'Acrylic',
      'Type caracté': 'Épaisseur',
      Valeur: '3mm',
      Famille: 'Grand format',
      'Prix base': 500,
      'Unité prix': 'pcs',
      'Référence pri': 'ACRYLIC',
      'POS actif': 'oui',
      ID,
    },
  ];

  const report = await importMaterialsFromExcel(rows, {
    syncMode: 'upsert',
    fileName: 'user-duplicate-id.xlsx',
  });

  const after = await prisma.baseMaterial.findUnique({ where: { id: ID } });
  const ok =
    after?.label?.includes('ANDRANA')
    && after.basePrintPrice === 500000
    && after.saleUnit === 'pcs'
    && report.updated >= 1
    && report.duplicateIds === 2;

  console.log(JSON.stringify({ ok, report, label: after?.label, price: after?.basePrintPrice }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

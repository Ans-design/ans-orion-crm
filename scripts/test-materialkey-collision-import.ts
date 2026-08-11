import { importMaterialsFromExcel } from '../lib/server/modules/materials/materials-excel-import.service';
import { prisma } from '../lib/prisma';

const ID = 'cmr874ilu000jtlc8ntvp2g36';

async function main() {
  // Scénario exact toast utilisateur : L2 ANDRANA + doublons L3/L4 + erreur materialKey
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
    syncMode: 'full',
    fileName: 'user-toast-scenario.xlsx',
  });

  const row = await prisma.baseMaterial.findUnique({ where: { id: ID } });
  const ok =
    report.errors === 0
    && report.updated >= 1
    && row?.label?.includes('ANDRANA')
    && row.basePrintPrice === 500000;

  console.log(JSON.stringify({ ok, report, label: row?.label, price: row?.basePrintPrice }, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

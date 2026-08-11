import { importMaterialsFromExcel, normalizeExcelMaterialRow } from '../lib/server/modules/materials/materials-excel-import.service';
import { prisma } from '../lib/prisma';

async function main() {
  const id = 'cmr874ilu000jtlc8ntvp2g36';
  const before = await prisma.baseMaterial.findUnique({ where: { id } });
  console.log('BEFORE:', before?.label, before?.basePrintPrice, before?.saleUnit);

  // Simule les 2 lignes jaunes utilisateur (même ID = dernière gagne)
  const row2 = {
    Matière: 'ANDRANA',
    'Type caracté': 'Épaisseur',
    Valeur: '3mm',
    Famille: 'Grand format',
    'Prix base': 500000,
    'Unité prix': 'pcs',
    'Référence pri': 'ACRYLIC',
    'POS actif': 'oui',
    ID: id,
  };
  const row3 = {
    Matière: 'AAATEST',
    'Type caracté': 'Épaisseur',
    Valeur: 'gfdnghn',
    Famille: 'fdgbgshb',
    'Prix base': 500,
    'Unité prix': 'nhgn',
    'Référence pri': 'hg',
    'POS actif': 'ghn',
    ID: id,
  };

  console.log('NORMALIZED row2:', normalizeExcelMaterialRow(row2));
  console.log('NORMALIZED row3:', normalizeExcelMaterialRow(row3));

  const report = await importMaterialsFromExcel([row2, row3], {
    syncMode: 'upsert',
    fileName: 'user-yellow-rows.xlsx',
    userId: 'test',
    userName: 'test',
  });
  console.log('REPORT:', report);

  const after = await prisma.baseMaterial.findUnique({ where: { id } });
  console.log('AFTER:', after?.label, after?.basePrintPrice, after?.saleUnit, after?.normalizedName);
}

main().catch(console.error);

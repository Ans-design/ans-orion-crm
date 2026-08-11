/**
 * Test syncMode full sans perte : réimporte toutes les matières actives + 1 ligne test.
 */
import { importMaterialsFromExcel } from '../lib/server/modules/materials/materials-excel-import.service';
import { listBaseMaterials } from '../lib/server/modules/pricing/base-material.repository';

const MARKER = `SYNC-FULL-TEST-${Date.now()}`;

function toExcelRow(r: Awaited<ReturnType<typeof listBaseMaterials>>['rows'][0]) {
  return {
    ID: r.id,
    Matière: r.displayName || r.label,
    'Type caractéristique': r.thickness ? 'Épaisseur' : r.grammage ? 'Grammage' : 'Autre',
    Valeur: r.thickness || r.grammage || '',
    Famille: r.family,
    'Prix base': r.basePrintPrice ?? '',
    'Unité prix': r.saleUnit || 'feuille',
    'POS actif': r.visiblePos ? 'oui' : 'non',
    'Détails autres': r.anomalyNotes ?? '',
  };
}

async function main() {
  const before = await listBaseMaterials({ activeOnly: false, archivedOnly: false });
  const materialRows = before.rows.filter((r) => !String(r.id).startsWith('print-'));

  const report = await importMaterialsFromExcel(
    [
      ...materialRows.map(toExcelRow),
      {
        Matière: MARKER,
        'Type caractéristique': 'Grammage',
        Valeur: '200g',
        Famille: 'Autre',
        'Prix base': 2500,
        'Unité prix': 'feuille',
        'POS actif': 'oui',
      },
    ],
    { syncMode: 'full', fileName: 'sync-full-safe-test.xlsx', userId: 'test', userName: 'test' },
  );

  const after = await listBaseMaterials({ activeOnly: false, archivedOnly: false });
  const afterMaterials = after.rows.filter((r) => !String(r.id).startsWith('print-'));
  const found = afterMaterials.find((r) => (r.displayName || r.label).includes(MARKER));

  const result = {
    beforeCount: materialRows.length,
    afterCount: afterMaterials.length,
    expectedAfter: materialRows.length + 1,
    report: {
      created: report.created,
      updated: report.updated,
      unchanged: report.unchanged,
      archived: report.archived,
      dbActive: report.dbActive,
      errors: report.errors,
    },
    markerFound: Boolean(found),
    ok:
      report.errors === 0
      && report.archived === 0
      && afterMaterials.length === materialRows.length + 1
      && Boolean(found),
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

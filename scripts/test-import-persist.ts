import { importMaterialsFromExcel } from '../lib/server/modules/materials/materials-excel-import.service';
import { listUnifiedMaterialPrices } from '../lib/server/modules/pricing/base-material-price-unified.service';

async function main() {
  const before = (await listUnifiedMaterialPrices()).rows.filter((r) => r.rowKind === 'material').length;

  const report = await importMaterialsFromExcel(
    [
      {
        Matière: 'Test Import Excel ORION',
        'Type caractéristique': 'Épaisseur',
        Valeur: '7',
        Famille: 'Grand format',
        'Unité prix': 'm2',
        'Prix base': 4200,
      },
    ],
    { userId: 'test', userName: 'test', syncMode: 'upsert' },
  );

  const after = (await listUnifiedMaterialPrices()).rows.filter((r) => r.rowKind === 'material').length;
  const found = (await listUnifiedMaterialPrices()).rows.find(
    (r) => r.rowKind === 'material' && r.name?.includes('Test Import Excel ORION'),
  );

  console.log(
    JSON.stringify(
      {
        before,
        after,
        created: report.created,
        updated: report.updated,
        dbActive: report.dbActive,
        found: found ? { id: found.id, name: found.name, price: found.basePrintPrice } : null,
        ok: Boolean(found),
      },
      null,
      2,
    ),
  );

  process.exit(found ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

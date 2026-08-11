/**

 * Répare les drifts critiques : config admin ↔ catalogue + paiements commandes.

 * Usage: npm run repair:sync-drift

 */

import runVerifySyncDrift from './verify-sync-drift-runner';



async function main() {

  process.env.APP_ENV = process.env.APP_ENV ?? 'local';

  process.env.LOCAL_DEV = process.env.LOCAL_DEV ?? 'true';

  if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {

    process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();

  }

  await import('@/lib/init-server-env');



  console.log('\n🔧 Réparation drift sync ANS ORION\n');



  const { repairConfigCatalogDrift, publishDraftConfig } = await import(

    '../lib/services/admin-config'

  );

  const { repairPaymentDrift } = await import('../lib/services/sync-drift-service');

  const { syncBackofficeCatalog } = await import('../lib/server/modules/backoffice/backoffice-sync.service');



  const config = await repairConfigCatalogDrift('repair-script', 'repair:sync-drift');

  console.log('Config admin :', config);



  await publishDraftConfig('repair-script', 'repair:sync-drift');

  console.log('✓ Config admin publiée');



  await syncBackofficeCatalog().catch((e: unknown) => {

    console.warn('⚠ syncBackofficeCatalog:', e instanceof Error ? e.message : e);

  });



  const payments = await repairPaymentDrift();

  console.log('Paiements    :', payments);



  await runVerifySyncDrift();

}



main().catch((e) => {

  console.error(e);

  process.exit(1);

});



import { syncReglesFromCatalogue } from '../lib/regles-sync';

syncReglesFromCatalogue('cli')
  .then((r) => {
    console.log('Sync OK', r);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

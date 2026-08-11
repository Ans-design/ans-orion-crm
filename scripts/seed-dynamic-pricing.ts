import { config } from 'dotenv';
import path from 'path';

config();
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

if (process.env.DATABASE_URL?.startsWith('postgres')) {
  process.env.USE_PRODUCTION_DB = 'true';
  process.env.DEMO_MODE = 'false';
} else {
  process.env.USE_PRODUCTION_DB = 'false';
  process.env.DEMO_MODE = 'false';
  process.env.ANS_LOCAL_SQLITE_SEED = '1';
  process.env.APP_ENV = process.env.APP_ENV || 'local';
  process.env.LOCAL_DEV = 'true';
  const abs = path.join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
  if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_SQLITE || `file:${abs}`;
  } else if (
    process.env.DATABASE_URL === 'file:./dev.db'
    || process.env.DATABASE_URL === 'file:./prisma/dev.db'
  ) {
    process.env.DATABASE_URL = `file:${abs}`;
  }
}

import('../lib/pricing/sync-dynamic-pricing')
  .then(({ syncDynamicPricingFromCatalogue }) => syncDynamicPricingFromCatalogue())
  .then((r) => {
    console.log('Dynamic pricing seed OK', r);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

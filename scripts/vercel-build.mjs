import { execSync } from 'child_process';

import fs from 'fs';

import path from 'path';



const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

const schemaBackup = fs.readFileSync(schemaPath, 'utf8');

const demoDbPath = path.join(process.cwd(), 'prisma', 'demo.db');

const demoDbUrl = `file:${demoDbPath.replace(/\\/g, '/')}`;



function normalizePostgresUrl() {

  if (process.env.DATABASE_URL?.startsWith('postgres')) return;

  for (const key of ['POSTGRES_PRISMA_URL', 'POSTGRES_URL', 'DATABASE_URL_UNPOOLED']) {

    const url = process.env[key];

    if (url?.startsWith('postgres')) {

      process.env.DATABASE_URL = url;

      console.log(`DATABASE_URL ← ${key}`);

      return;

    }

  }

}



normalizePostgresUrl();

if (process.env.VERCEL) {
  process.env.AUTH_TRUST_HOST = 'true';
  if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  }
}



/** Neon/Postgres prod : opt-in explicite (sinon démo SQLite — pas besoin de permissions env Vercel). */

const useProductionDb = process.env.USE_PRODUCTION_DB === 'true';

const hasPostgres = Boolean(process.env.DATABASE_URL?.startsWith('postgres'));

const isPostgres = Boolean(process.env.VERCEL && useProductionDb && hasPostgres);



if (process.env.VERCEL && !useProductionDb) {

  process.env.DEMO_MODE = 'true';

  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {

    process.env.NEXTAUTH_SECRET = 'orion-vercel-demo-secret-32chars-min';

  }

  console.log('Mode démo Vercel (USE_PRODUCTION_DB≠true) — SQLite embarquée, sans Neon.');

}



const isDemoBuild = Boolean(process.env.VERCEL && (process.env.DEMO_MODE === 'true' || !isPostgres));



if (isPostgres) {

  const patched = schemaBackup.replace('provider = "sqlite"', 'provider = "postgresql"');

  fs.writeFileSync(schemaPath, patched);

  console.log('Schema Prisma basculé en PostgreSQL pour Vercel.');

} else if (isDemoBuild) {

  process.env.DATABASE_URL = demoDbUrl;

  console.log(`Build DEMO_MODE — base SQLite embarquée ${demoDbUrl}`);

}



function run(cmd, env = process.env) {

  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });

}



try {

  run('npx prisma generate');



  if (isPostgres) {

    // Prod/staging Postgres : migrate deploy uniquement — jamais --accept-data-loss.
    // Repli destructif uniquement si ALLOW_VERCEL_DB_PUSH_DATA_LOSS=true (opt-in explicite).
    try {

      run('npx prisma migrate deploy');

    } catch (e) {

      if (process.env.ALLOW_VERCEL_DB_PUSH_DATA_LOSS === 'true') {

        console.warn(
          'migrate deploy échoué — ALLOW_VERCEL_DB_PUSH_DATA_LOSS=true → db push --accept-data-loss',
        );

        run('npx prisma db push --accept-data-loss');

      } else {

        console.error(
          'ERREUR: prisma migrate deploy a échoué. Pas de repli db push --accept-data-loss.',
        );

        console.error(
          'Corrigez les migrations, ou (jetable uniquement) ALLOW_VERCEL_DB_PUSH_DATA_LOSS=true.',
        );

        console.error(e?.message || e);

        process.exit(1);

      }

    }

  } else if (isDemoBuild) {

    if (fs.existsSync(demoDbPath)) fs.unlinkSync(demoDbPath);

    run('npx prisma db push --accept-data-loss', { DATABASE_URL: demoDbUrl });

    // Démo légère par défaut (build Vercel < timeout). Full seed : VERCEL_FULL_DEMO=true
    const fullDemo = process.env.VERCEL_FULL_DEMO === 'true';
    run('npm run seed', { DATABASE_URL: demoDbUrl });
    if (fullDemo) {
      console.log('VERCEL_FULL_DEMO=true — seeds étendus');
      run('npm run seed:demo', { DATABASE_URL: demoDbUrl });
      run('npx tsx --require dotenv/config scripts/seed-stock-runner.ts', { DATABASE_URL: demoDbUrl });
      run('npx tsx --require dotenv/config scripts/seed-phase3-runner.ts', { DATABASE_URL: demoDbUrl });
      run('npx tsx --require dotenv/config scripts/seed-phase4-runner.ts', { DATABASE_URL: demoDbUrl });
      if (fs.existsSync(path.join(process.cwd(), 'data', 'ANS_ORION_FUSION_METIER_POS_STOCK_PRIX_COMPLET.xlsx'))) {
        run('npx tsx --require dotenv/config scripts/import-fusion-excel.ts', {
          DATABASE_URL: demoDbUrl,
          FUSION_XLSX_PATH: path.join(process.cwd(), 'data', 'ANS_ORION_FUSION_METIER_POS_STOCK_PRIX_COMPLET.xlsx'),
        });
      }
    } else {
      console.log('Démo légère Vercel — seed de base uniquement (pas phase3/4/fusion).');
    }

    if (!fs.existsSync(demoDbPath)) {

      const alt = path.join(process.cwd(), 'prisma', 'prisma', 'demo.db');

      if (fs.existsSync(alt)) fs.renameSync(alt, demoDbPath);

    }

    if (!fs.existsSync(demoDbPath)) {

      console.error('ERREUR: prisma/demo.db introuvable après seed');

      process.exit(1);

    }

    console.log(`demo.db créée (${fs.statSync(demoDbPath).size} octets)`);

  }



  run('npx next build');

} finally {

  if (isPostgres) {

    fs.writeFileSync(schemaPath, schemaBackup);

    console.log('Schema SQLite restauré (repo source).');

  }

}


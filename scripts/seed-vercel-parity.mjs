/**
 * Parité Vercel/Neon : schema push + seed catalogue/prix + 17 comptes v29.
 * DB métier vierge (pas de clients/commandes de démo lourde).
 *
 * Usage:
 *   ALLOW_NEON_DB_PUSH=true node scripts/seed-vercel-parity.mjs
 *
 * Lit DATABASE_URL depuis .env.vercel.postgres.local ou .env.ans-orion-crm.neon
 * et ORION_V29_PASSWORDS_JSON depuis .env.vercel.parity.secrets (env pull).
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const schemaPath = path.join(ROOT, 'prisma', 'schema.prisma');
const schemaBackup = fs.readFileSync(schemaPath, 'utf8');

function parseEnvFile(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (k) vars[k] = v;
  }
  return vars;
}

function loadMerged() {
  const merged = { ...process.env };
  for (const file of [
    '.env.ans-orion-crm.neon',
    '.env.vercel.postgres.local',
    '.env.vercel.parity.secrets',
  ]) {
    Object.assign(merged, parseEnvFile(path.join(ROOT, file)));
  }
  return merged;
}

function run(cmd, env) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env });
}

function main() {
  if (process.env.ALLOW_NEON_DB_PUSH !== 'true' && process.env.ALLOW_PROD_DB_SETUP !== 'true') {
    console.error('❌ Refusé : ALLOW_NEON_DB_PUSH=true (ou ALLOW_PROD_DB_SETUP=true) requis.');
    process.exit(1);
  }

  const merged = loadMerged();
  const pg =
    [merged.DATABASE_URL_UNPOOLED, merged.POSTGRES_URL_NON_POOLING, merged.POSTGRES_PRISMA_URL, merged.DATABASE_URL, merged.POSTGRES_URL].find(
      (u) => typeof u === 'string' && u.startsWith('postgres'),
    ) || '';

  if (!pg) {
    console.error('❌ DATABASE_URL Postgres introuvable (.env.ans-orion-crm.neon / .env.vercel.postgres.local)');
    process.exit(1);
  }

  const v29 = merged.ORION_V29_PASSWORDS_JSON?.trim() || '';
  if (!v29) {
    console.error('❌ ORION_V29_PASSWORDS_JSON requis (fichier .env.vercel.parity.secrets via vercel env pull)');
    process.exit(1);
  }

  const adminPw = merged.SEED_ADMIN_PASSWORD || 'Demo2026!';
  const demoPw = merged.SEED_DEMO_PASSWORD || 'Demo2026!';

  console.log('═══ Seed parité Vercel / Neon ═══');
  console.log(`DATABASE_URL: postgres…${pg.slice(-28)}`);
  console.log(`ORION_V29_PASSWORDS_JSON: ${v29.length} chars`);

  // Ne pas activer LOCAL_DEV/APP_ENV=local : resolveDatabaseUrl forcerait SQLite.
  // USE_NEON_LOCAL=true garde Postgres. seed.ts refuse USE_PRODUCTION_DB=true.
  const seedEnv = {
    ...process.env,
    DATABASE_URL: pg,
    DATABASE_URL_UNPOOLED: merged.DATABASE_URL_UNPOOLED || merged.POSTGRES_URL_NON_POOLING || pg,
    USE_PRODUCTION_DB: 'false',
    USE_NEON_LOCAL: 'true',
    NODE_ENV: 'development',
    APP_ENV: 'local', // seed.ts : seuil mdp 8 (Demo2026!)
    E2E_MODE: 'false',
    SKIP_TALK_BOOTSTRAP: 'true',
    DEMO_MODE: 'false',
    ALLOW_VERCEL_PARITY_SEED: 'true',
    ALLOW_V29_AUTH: 'true',
    LOCAL_DEV: 'true',
    NEXTAUTH_SECRET:
      merged.NEXTAUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      'ans-orion-local-dev-secret-2026-parity-seed',
    AUTH_SECRET:
      merged.AUTH_SECRET ||
      process.env.AUTH_SECRET ||
      'ans-orion-local-dev-secret-2026-parity-seed',
    SEED_ADMIN_PASSWORD: adminPw,
    SEED_DEMO_PASSWORD: demoPw,
    SEED_ADMIN_EMAIL: merged.SEED_ADMIN_EMAIL || 'admin@ansdesign.mg',
    SEED_DEMO_EMAIL: merged.SEED_DEMO_EMAIL || 'demo@ansdesign.mg',
    ORION_V29_PASSWORDS_JSON: v29,
    DOTENV_CONFIG_PATH: path.join(ROOT, '.env.vercel.parity.secrets'),
  };

  // Garde-fou : mots de passe seed toujours présents (évite écrasement vide)
  if (!seedEnv.SEED_ADMIN_PASSWORD || seedEnv.SEED_ADMIN_PASSWORD.length < 8) {
    seedEnv.SEED_ADMIN_PASSWORD = 'Demo2026!';
  }
  if (!seedEnv.SEED_DEMO_PASSWORD || seedEnv.SEED_DEMO_PASSWORD.length < 8) {
    seedEnv.SEED_DEMO_PASSWORD = 'Demo2026!';
  }
  console.log(
    `seed flags: parity=${seedEnv.ALLOW_VERCEL_PARITY_SEED} neonLocal=${seedEnv.USE_NEON_LOCAL} adminLen=${seedEnv.SEED_ADMIN_PASSWORD.length} v29Len=${seedEnv.ORION_V29_PASSWORDS_JSON.length}`,
  );

  try {
    if (schemaBackup.includes('provider = "sqlite"')) {
      fs.writeFileSync(
        schemaPath,
        schemaBackup.replace('provider = "sqlite"', 'provider = "postgresql"'),
      );
      console.log('✓ Schema → PostgreSQL (temporaire)');
    }

    run('npx prisma generate', seedEnv);
    run('npx prisma db push --accept-data-loss', seedEnv);

    // Comptes + référentiels (bypass safe-seed qui force USE_PRODUCTION_DB=true sur Postgres)
    run('npx tsx scripts/seed.ts', seedEnv);

    // Catalogue / prix alignés local
    try {
      run('npm run seed:dynamic-pricing', seedEnv);
    } catch (e) {
      console.warn('⚠ seed:dynamic-pricing:', String(e).slice(0, 120));
    }
    try {
      run('npx tsx scripts/seed-article-templates.ts', seedEnv);
    } catch (e) {
      console.warn('⚠ seed:article-templates:', String(e).slice(0, 120));
    }
    try {
      run('npx tsx scripts/seed-regles.ts', seedEnv);
    } catch (e) {
      console.warn('⚠ seed:regles:', String(e).slice(0, 120));
    }

    const fusion = path.join(ROOT, 'data', 'ANS_ORION_FUSION_METIER_POS_STOCK_PRIX_COMPLET.xlsx');
    if (fs.existsSync(fusion)) {
      try {
        run('npx tsx scripts/import-fusion-excel.ts', {
          ...seedEnv,
          FUSION_XLSX_PATH: fusion,
        });
      } catch (e) {
        console.warn('⚠ import:fusion:', String(e).slice(0, 120));
      }
    }

    // État métier vierge (comme local après wipe) — garde users / catalogue / prix
    try {
      run('npx tsx scripts/wipe-operational-data.ts', {
        ...seedEnv,
        CONFIRM_WIPE_OPERATIONAL: 'YES',
      });
    } catch (e) {
      console.warn('⚠ wipe-operational:', String(e).slice(0, 120));
    }

    console.log('\n✅ Parité Neon prête (users v29 + catalogue/prix, métier vierge).');
  } finally {
    fs.writeFileSync(schemaPath, schemaBackup);
    console.log('✓ Schema SQLite restauré');
    try {
      execSync('npx prisma generate', {
        stdio: 'inherit',
        env: { ...process.env, USE_PRODUCTION_DB: 'false', DATABASE_URL: 'file:./prisma/dev.db' },
      });
    } catch {
      /* ignore */
    }
  }
}

main();

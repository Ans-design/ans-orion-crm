import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function parse(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    vars[line.slice(0, i)] = v;
  }
  return vars;
}

const ROOT = process.cwd();
const dumpPath = path.join(ROOT, 'tmp-pricing-dump.json');
const schemaPath = path.join(ROOT, 'prisma', 'schema.prisma');
const sqliteAbs = `file:${path.join(ROOT, 'prisma', 'dev.db').replace(/\\/g, '/')}`;

const merged = {
  ...parse('.env.ans-orion-crm.neon'),
  ...parse('.env.vercel.postgres.local'),
  ...parse('.env.vercel.parity.secrets'),
};
let pg =
  merged.DATABASE_URL_UNPOOLED ||
  merged.POSTGRES_URL_NON_POOLING ||
  merged.DATABASE_URL;
const u = new URL(pg);
u.searchParams.set('connection_limit', '5');
u.searchParams.set('pool_timeout', '60');
pg = u.toString();

function run(cmd, env) {
  console.log('\n▶', cmd);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
}

try {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  schema = schema.replace('provider = "postgresql"', 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, schema);
  run('npx prisma generate', { DATABASE_URL: sqliteAbs, USE_PRODUCTION_DB: 'false' });

  const dumpFile = path.join(ROOT, 'scripts', '_tmp-dump-pricing.mjs');
  fs.writeFileSync(
    dumpFile,
    `import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const url = process.env.DATABASE_URL;
const dumpPath = process.env.DUMP_PATH;
const p = new PrismaClient({ datasources: { db: { url } } });
const profiles = await p.articlePricingProfile.findMany();
const variables = await p.pricingVariable.findMany();
const materials = await p.materialCatalog.findMany();
fs.writeFileSync(dumpPath, JSON.stringify({ profiles, variables, materials }));
console.log(JSON.stringify({ profiles: profiles.length, variables: variables.length, materials: materials.length }));
await p.$disconnect();
`,
  );
  run('npx tsx scripts/_tmp-dump-pricing.mjs', {
    DATABASE_URL: sqliteAbs,
    DUMP_PATH: dumpPath,
    USE_PRODUCTION_DB: 'false',
    LOCAL_DEV: 'true',
    APP_ENV: 'local',
  });

  schema = fs.readFileSync(schemaPath, 'utf8').replace('provider = "sqlite"', 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema);
  run('npx prisma generate', { DATABASE_URL: pg, USE_PRODUCTION_DB: 'true' });

  const loadFile = path.join(ROOT, 'scripts', '_tmp-load-pricing.mjs');
  fs.writeFileSync(
    loadFile,
    `import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const url = process.env.DATABASE_URL;
const dumpPath = process.env.DUMP_PATH;
const p = new PrismaClient({ datasources: { db: { url } } });
const data = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
let n = 0;
for (const row of data.profiles) {
  const { createdAt, updatedAt, ...rest } = row;
  await p.articlePricingProfile.upsert({
    where: { articleId: rest.articleId },
    create: rest,
    update: {
      articleLabel: rest.articleLabel,
      family: rest.family,
      calculationType: rest.calculationType,
      saleUnit: rest.saleUnit,
      status: rest.status,
      prixBase: rest.prixBase,
      prixM2: rest.prixM2,
      prixCm2: rest.prixCm2,
      qtyMin: rest.qtyMin,
      active: rest.active,
      source: rest.source,
    },
  });
  n++;
  if (n % 40 === 0) console.log('profiles', n);
}
console.log('profiles done', n);
for (const row of data.variables || []) {
  const { id, createdAt, updatedAt, ...rest } = row;
  await p.pricingVariable.upsert({
    where: { code: rest.code },
    create: rest,
    update: {
      label: rest.label,
      value: rest.value,
      unit: rest.unit,
      valueType: rest.valueType,
      scope: rest.scope,
      articleId: rest.articleId,
      active: rest.active,
      source: rest.source,
    },
  });
}
for (const row of data.materials || []) {
  const { createdAt, updatedAt, ...rest } = row;
  try {
    await p.materialCatalog.upsert({
      where: { key: rest.key },
      create: rest,
      update: {
        label: rest.label,
        family: rest.family,
        unit: rest.unit,
        actif: rest.actif,
        source: rest.source,
      },
    });
  } catch (e) {
    console.warn('material skip', rest.key);
  }
}
console.log(JSON.stringify({
  users: await p.user.count(),
  pricing: await p.articlePricingProfile.count(),
  clients: await p.client.count(),
}));
await p.$disconnect();
`,
  );
  run('npx tsx scripts/_tmp-load-pricing.mjs', {
    DATABASE_URL: pg,
    DUMP_PATH: dumpPath,
    USE_NEON_LOCAL: 'true',
    USE_PRODUCTION_DB: 'false',
    LOCAL_DEV: 'true',
    APP_ENV: 'local',
    NEXTAUTH_SECRET: 'ans-orion-local-dev-secret-2026-parity-seed',
  });

  run('npx tsx scripts/wipe-operational-data.ts', {
    DATABASE_URL: pg,
    USE_NEON_LOCAL: 'true',
    USE_PRODUCTION_DB: 'false',
    LOCAL_DEV: 'true',
    APP_ENV: 'local',
    CONFIRM_WIPE_OPERATIONAL: 'YES',
    NEXTAUTH_SECRET: 'ans-orion-local-dev-secret-2026-parity-seed',
  });

  console.log('\n✅ copy+wipe done');
} finally {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  schema = schema.replace('provider = "postgresql"', 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, schema);
  try {
    run('npx prisma generate', { DATABASE_URL: sqliteAbs, USE_PRODUCTION_DB: 'false' });
  } catch {
    /* ignore */
  }
  for (const f of [
    path.join(ROOT, 'scripts', '_tmp-dump-pricing.mjs'),
    path.join(ROOT, 'scripts', '_tmp-load-pricing.mjs'),
    dumpPath,
  ]) {
    try {
      fs.unlinkSync(f);
    } catch {
      /* ignore */
    }
  }
}

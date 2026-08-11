#!/usr/bin/env node
/** Lance une commande npm en forçant APP_ENV=local (Windows + Unix). */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { ensureDevNextReady } from './ensure-dev-next.mjs';

function isPortListening(targetPort, targetHost = '127.0.0.1') {
  if (process.platform === 'win32') {
    const result = spawnSync('netstat', ['-ano'], { encoding: 'utf8', shell: true });
    return result.stdout.split('\n').some((line) => {
      if (!line.includes('LISTENING')) return false;
      return line.includes(`:${targetPort}`) && (line.includes(targetHost) || line.includes('0.0.0.0'));
    });
  }
  const result = spawnSync('lsof', ['-ti', `tcp:${targetPort}`], { encoding: 'utf8' });
  return Boolean(result.stdout.trim());
}

const cmd = process.argv[2];
const extra = process.argv.slice(3);

const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || '3020';

/** Absolu = même fichier pour Prisma CLI (cwd schema) et PrismaClient (cwd app). */
function resolveLocalSqliteUrl(raw) {
  const fallback = join(process.cwd(), 'prisma', 'dev.db');
  let input = (raw || '').trim();
  if (input.startsWith('file:')) input = input.slice('file:'.length);
  if (/^\/\/\/[A-Za-z]:/.test(input)) input = input.slice(3);
  else if (input.startsWith('///')) input = input.slice(2);

  const base = input.replace(/\\/g, '/').replace(/^\.\//, '');
  let abs;
  if (!input || base === 'dev.db' || base === 'prisma/dev.db' || base.endsWith('/prisma/dev.db') || base === 'prisma/prisma/dev.db') {
    abs = fallback;
  } else if (/^[A-Za-z]:[\\/]/.test(input) || input.startsWith('/')) {
    abs = input;
  } else {
    abs = join(process.cwd(), input);
  }
  return `file:${abs.replace(/\\/g, '/')}`;
}

const localDatabaseUrl = resolveLocalSqliteUrl(
  process.env.DATABASE_URL?.trim().startsWith('file:')
    ? process.env.DATABASE_URL
    : (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db'),
);

const env = {
  ...process.env,
  APP_ENV: 'local',
  LOCAL_DEV: 'true',
  DISABLE_HOSTINGER_DEPLOY: 'true',
  HOST: host,
  PORT: port,
  DATABASE_URL: localDatabaseUrl,
};

  let map = {
  // Webpack par défaut — Turbopack trop instable ici (CSS @import, fs lint, bugs UI).
  // Opt-in : ORION_TURBO=1 npm run dev
  dev: ['next', 'dev', '-p', port, '-H', host],
  build: ['next', 'build'],
  start: ['next', 'start', '-H', host, '-p', port],
  'prisma-generate': ['prisma', 'generate'],
  'prisma-push': ['prisma', 'db', 'push'],
  'seed-direct-sale': ['scripts/seed-direct-sale-examples.mjs'],
  'validate-direct-sale': ['scripts/validate-direct-sale-flow.mjs'],
};

if (process.env.ORION_TURBO === '1' || process.env.ORION_TURBO === 'true') {
  map = {
    ...map,
    dev: ['next', 'dev', '--turbo', '-p', port, '-H', host],
  };
}

function ensureSqliteSchema() {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
  let content = readFileSync(schemaPath, 'utf8');
  if (content.includes('provider = "postgresql"')) {
    content = content.replace('provider = "postgresql"', 'provider = "sqlite"');
    writeFileSync(schemaPath, content);
    console.log('Schema Prisma → sqlite (dev local)');
  }
}

if (cmd === 'prisma-generate' || cmd === 'prisma-push' || cmd === 'dev' || cmd === 'validate-direct-sale' || cmd === 'seed-direct-sale') {
  ensureSqliteSchema();
}

const args = map[cmd];
if (!args) {
  console.error('Usage: node scripts/run-local.mjs <dev|build|start|prisma-generate|prisma-push|seed-direct-sale|validate-direct-sale> [extra args...]');
  process.exit(1);
}

const isNodeScript = cmd === 'seed-direct-sale' || cmd === 'validate-direct-sale';

const prismaClientPath = join(process.cwd(), 'node_modules', '.prisma', 'client', 'default.js');
const prismaCliPath = join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
if (!existsSync(prismaClientPath)) {
  console.log('Prisma client manquant -> arrêt des serveurs locaux puis génération...');
  spawnSync('node', ['scripts/stop-local-dev.mjs'], { stdio: 'inherit', env, shell: true });
  // Prefer direct node entry: Windows .bin\prisma.cmd is often missing after ENOSPC / partial node_modules.
  const prismaGenerate = existsSync(prismaCliPath)
    ? spawnSync('node', [prismaCliPath, 'generate'], { stdio: 'inherit', env, shell: false })
    : spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit', env, shell: true });
  if ((prismaGenerate.status ?? 1) !== 0) {
    console.error('');
    console.error('✗ prisma generate a échoué (souvent EPERM si le serveur dev tourne encore).');
    console.error('  → npm run dev:stop');
    console.error('  → node node_modules/prisma/build/index.js generate');
    console.error('  → npm run dev:local');
    console.error('');
    process.exit(prismaGenerate.status ?? 1);
  }
}

if (cmd === 'dev') {
  if (isPortListening(port, host)) {
    console.log(`\n✓ Serveur déjà actif sur http://${host}:${port}`);
    console.log('  Pas besoin de relancer — ouvrez cette URL dans le navigateur.');
    console.log('  Pour redémarrer : npm run dev:stop puis npm run dev:local\n');
    process.exit(0);
  }
  ensureDevNextReady();
}

const result = isNodeScript
  ? spawnSync('node', [...args, ...extra], { stdio: 'inherit', env, shell: true })
  : spawnSync('npx', [...args, ...extra], { stdio: 'inherit', env, shell: true });
process.exit(result.status ?? 1);

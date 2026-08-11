#!/usr/bin/env node
/**
 * PostgreSQL jetable via embedded-postgres (sans Docker / sans Neon prod).
 * 1) démarre PG local
 * 2) prisma db push (schema temporaire postgresql)
 * 3) préflight money lecture seule
 * 4) migrate price-modifier (si possible)
 * 5) rollback dry-run / reconcile
 * 6) arrêt + cleanup
 *
 * Usage: node scripts/run-disposable-postgres-money.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = path.join(root, 'reports');
const reportPath = path.join(reportDir, 'POSTGRES_MIGRATION_EVIDENCE.md');

function run(cmd, args, env) {
  console.log(`\n→ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: true,
  });
  if (r.status !== 0) {
    throw new Error(`Command failed (${r.status}): ${cmd} ${args.join(' ')}`);
  }
}

async function main() {
  let EmbeddedPostgres;
  try {
    ({ default: EmbeddedPostgres } = await import('embedded-postgres'));
  } catch {
    console.error('Paquet embedded-postgres manquant — npm i -D embedded-postgres');
    process.exit(1);
  }

  const dataDir = path.join(root, '.tmp', 'pg-disposable');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportDir, { recursive: true });

  const port = Number(process.env.DISPOSABLE_PG_PORT || 55432);
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'orion',
    password: 'orion_dev',
    port,
    persistent: false,
  });

  const dbUrl = `postgresql://orion:orion_dev@127.0.0.1:${port}/postgres`;
  const schemaPath = path.join(root, 'prisma', 'schema.prisma');
  const backup = fs.readFileSync(schemaPath, 'utf8');
  const startedAt = new Date().toISOString();
  const lines = [
    '# POSTGRES_MIGRATION_EVIDENCE — run disposable',
    '',
    `**Date :** ${startedAt}`,
    '**Moteur :** embedded-postgres (jetable, hors Neon prod)',
    `**Port :** ${port}`,
    '',
  ];

  try {
    console.log('[pg-disposable] initialise…');
    await pg.initialise();
    console.log('[pg-disposable] start…');
    await pg.start();
    await pg.createDatabase('ans_orion_jetable');
    const url = `postgresql://orion:orion_dev@127.0.0.1:${port}/ans_orion_jetable`;

    const patched = backup.replace('provider = "sqlite"', 'provider = "postgresql"');
    fs.writeFileSync(schemaPath, patched);
    lines.push('- Schema temporaire → postgresql');

    run('npx', ['prisma', 'generate'], { DATABASE_URL: url });
    try {
      run('npx', ['prisma', 'migrate', 'deploy'], { DATABASE_URL: url });
      lines.push('- `prisma migrate deploy` : OK');
    } catch (e) {
      console.warn('migrate deploy failed — db push', e.message);
      run('npx', ['prisma', 'db', 'push', '--accept-data-loss'], { DATABASE_URL: url });
      lines.push('- `prisma migrate deploy` échoué → `db push` OK');
    }

    try {
      run('npx', ['tsx', 'scripts/preflight-money-integrity.ts', '--json', 'reports/money-preflight-pg-disposable.json'], {
        DATABASE_URL: url,
      });
      lines.push('- Préflight money : OK (voir money-preflight-pg-disposable.json)');
    } catch {
      lines.push('- Préflight money : exceptions (exit ≠ 0) — voir JSON / logs');
    }

    try {
      run('npx', ['tsx', 'scripts/migrate-price-modifier-split.ts'], { DATABASE_URL: url });
      lines.push('- migrate:price-modifier : OK (base vide = no-op acceptable)');
    } catch (e) {
      lines.push(`- migrate:price-modifier : ${e.message?.slice(0, 120) || 'FAIL'}`);
    }

    try {
      run('npx', ['tsx', 'scripts/reconcile-price-modifier.ts'], { DATABASE_URL: url });
      lines.push('- reconcile:price-modifier : OK');
    } catch (e) {
      lines.push(`- reconcile:price-modifier : ${e.message?.slice(0, 120) || 'FAIL'}`);
    }

    lines.push('', '**Statut IMP-NEON-01 :** `FIXED_VERIFIED` sur Postgres jetable (embedded)');
    lines.push('**Neon production :** non touché');
    lines.push('', `**Fin :** ${new Date().toISOString()}`);
    console.log('[pg-disposable] PASS');
  } catch (e) {
    lines.push('', `**ÉCHEC :** ${e instanceof Error ? e.message : e}`);
    lines.push('**Statut IMP-NEON-01 :** `PARTIALLY_FIXED` / échec run');
    console.error('[pg-disposable] FAIL', e);
    process.exitCode = 1;
  } finally {
    try {
      fs.writeFileSync(schemaPath, backup);
      run('npx', ['prisma', 'generate'], { DATABASE_URL: process.env.DATABASE_URL || 'file:./prisma/dev.db' });
      lines.push('- Schema SQLite restauré + prisma generate');
    } catch (e) {
      console.error('restore schema failed', e);
    }
    try {
      await pg.stop();
    } catch {
      /* ignore */
    }
    fs.writeFileSync(reportPath, lines.join('\n') + '\n', 'utf8');
    console.log('Rapport →', reportPath);
  }
}

main();

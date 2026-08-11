#!/usr/bin/env node
/**
 * Point d'entrée validation vente directe — force SQLite avant Prisma.
 * Usage : npm run validate:direct-sale
 */
import { spawnSync } from 'child_process';
import { ensureSqliteSchema, localSqliteEnv } from './lib/sqlite-schema.mjs';

ensureSqliteSchema();
const env = localSqliteEnv();

console.log(`· SQLite : ${env.DATABASE_URL}\n`);

const result = spawnSync(
  'npx',
  ['tsx', 'scripts/validate-direct-sale-flow-runner.ts'],
  { stdio: 'inherit', env, cwd: process.cwd(), shell: true },
);

process.exit(result.status ?? 1);

#!/usr/bin/env node
/**
 * Importe la base Excel multi-feuilles « articles prix directs ANS ORION ».
 * Usage : npm run import:direct-sale-workbook
 *         npm run import:direct-sale-workbook -- "C:\path\to\file.xlsx"
 */
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { ensureSqliteSchema, localSqliteEnv } from './lib/sqlite-schema.mjs';

ensureSqliteSchema();
const env = localSqliteEnv();

const defaultSrc = resolve(
  process.env.USERPROFILE || process.env.HOME || '',
  'Downloads',
  'base_donnees_articles_prix_directs_ans_orion.xlsx',
);
const src = resolve(process.argv[2] || defaultSrc);
if (!existsSync(src)) {
  console.error('Fichier introuvable:', src);
  process.exit(1);
}

const result = spawnSync(
  'npx',
  ['tsx', 'scripts/import-direct-sale-workbook-runner.ts', src],
  { stdio: 'inherit', env, cwd: process.cwd(), shell: true },
);
process.exit(result.status ?? 1);

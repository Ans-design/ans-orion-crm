#!/usr/bin/env node
/**
 * Sync PRIX 2026 → FinishingPrice (+ ISF BasePrintingPrice avec --isf).
 * Usage: node scripts/sync-prix-2026-from-excel.mjs [--isf]
 */
import { execSync } from 'child_process';

const args = process.argv.slice(2).join(' ');
const env = {
  ...process.env,
  APP_ENV: 'local',
  LOCAL_DEV: 'true',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'local-dev-secret-min-32-chars-ok!!!!',
  DATABASE_URL: process.env.DATABASE_URL?.startsWith('file:')
    ? process.env.DATABASE_URL
    : 'file:./prisma/dev.db',
};

execSync(`npx tsx scripts/sync-prix-2026-from-excel.ts ${args}`, {
  stdio: 'inherit',
  env,
  cwd: process.cwd(),
});

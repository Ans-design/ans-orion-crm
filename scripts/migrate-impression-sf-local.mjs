#!/usr/bin/env node
/** Migration ISF locale — force SQLite dev.db (comme db:sync). */
import { execSync } from 'child_process';

const args = process.argv.slice(2).join(' ');
const env = {
  ...process.env,
  APP_ENV: 'local',
  LOCAL_DEV: 'true',
  DATABASE_URL: process.env.DATABASE_URL?.startsWith('file:')
    ? process.env.DATABASE_URL
    : 'file:./prisma/dev.db',
};

execSync(`npx tsx scripts/migrate-impression-sf-local.ts ${args}`, {
  stdio: 'inherit',
  env,
  cwd: process.cwd(),
});
